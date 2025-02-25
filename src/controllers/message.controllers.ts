import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import { Chat } from "../models/chat.models";
import ApiError from "../utils/ApiError";
import { AuthenticatedRequest } from "../types/request.type";
import { AttachmentType, MessageType } from "../types/message.type";
import { ChatMessage } from "../models/message.models";
import { ApiResponse } from "../utils/ApiResponse";
import {
  getLocalPath,
  getStaticFilePath,
  removeLocalFile,
} from "../utils/FileOperations";
import { emitSocketEvent } from "../socket";
import { ChatEventEnum } from "../utils/constants";
import { ChatType } from "../types/chat.type";
import redisClient from "../utils/redis";
import { validateUser } from "../utils/userHelper";
import { resilientApiCall } from "../utils/apiRetry";

/**
 * Returns an aggregation pipeline stage array that projects the common fields for a chat message.
 *
 * This pipeline stage includes the following fields:
 * - sender: The identifier of the user who sent the message.
 * - receivers: The identifiers of the users who received the message.
 * - content: The textual content of the message.
 * - attachments: Any files or media attached to the message.
 * - status: The current status of the message (e.g., sent, delivered, read).
 * - reactions: User reactions to the message.
 * - edited: Indicates whether the message has been edited.
 * - isDeleted: Indicates whether the message has been deleted.
 * - replyTo: Reference to another message to which this message is replying.
 * - createdAt: Timestamp when the message was created.
 * - updatedAt: Timestamp when the message was last updated.
 *
 * @returns An array containing a single MongoDB aggregation pipeline stage for message projection.
 */
const chatMessageCommonAggregation = (): PipelineStage[] => {
  return [
    {
      $project: {
        sender: 1,
        receivers: 1,
        content: 1,
        attachments: 1,
        status: 1,
        reactions: 1,
        edited: 1,
        isDeleted: 1,
        replyTo: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];
};

/**
 * Retrieves all messages for a specific chat.
 *
 * The function fetches messages associated with the chat specified by the "chatId" parameter in the request.
 * It first verifies that the chat exists and that the authenticated user is a participant of the chat.
 * If the chat does not exist, it throws an ApiError with a 404 status; if the user is not a participant,
 * it throws an ApiError with a 400 status. The messages are retrieved using an aggregation pipeline that
 * includes common chat message aggregations and sorts the messages in descending order based on their
 * creation time. The response is sent with a 200 status and contains the fetched messages.
 *
 * @param req - The Express Request object, where req.params contains the "chatId" and req is extended with authentication details.
 * @param res - The Express Response object used to deliver the JSON response.
 *
 * @throws {ApiError} 404 - Thrown if the chat with the given chatId does not exist.
 * @throws {ApiError} 400 - Thrown if the authenticated user is not a participant in the chat.
 *
 * @returns {Promise<void>} - Returns a promise that resolves when the response is sent.
 */
const getAllMessages = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const cacheKey = `messages:${chatId}`;

  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(cachedData),
          "Messages fetched from cache"
        )
      );
    return;
  }

  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "Chat doesnot exist.");
  }

  if (
    !selectedChat.participants.some(
      (participant) =>
        participant.userId === (req as AuthenticatedRequest).user.id
    )
  ) {
    throw new ApiError(400, "User is not part of chat.");
  }

  const messages: MessageType[] = await ChatMessage.aggregate([
    {
      $match: {
        chat: new Types.ObjectId(chatId),
      },
    },
    ...chatMessageCommonAggregation(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  await redisClient.set(cacheKey, JSON.stringify(messages), { EX: 60 });

  res
    .status(200)
    .json(
      new ApiResponse(200, messages || [], "Messages fetched successfully")
    );
  return;
};

/**
 * Sends a message to a chat and notifies the receivers via socket events.
 *
 * This function handles sending a message within a specified chat session. It validates
 * the presence of either text content or attachments. If a chat is found and valid, it
 * creates a new chat message and updates the chat's lastMessage field. The message is then
 * enriched with additional aggregation details before emitting a socket event to notify
 * all participants (except the sender) about the new message.
 *
 * @param req - The Express Request object, which should include:
 *   - params.chatId: The identifier of the chat.
 *   - body.content: The textual content of the message.
 *   - files or files.attachments: The file attachments, if any.
 *   - user: The authenticated user, available on the request (via middleware).
 *
 * @param res - The Express Response object used to send the HTTP response.
 *
 * @throws {ApiError} Throws an error if:
 *   - Neither content nor attachments are provided.
 *   - The chat with the specified chatId does not exist.
 *   - Unable to determine the message receivers.
 *   - The received message fails to be prepared (internal server error).
 *
 * @returns {Promise<void>} The function does not return a value but sends an HTTP response
 *   containing the saved message upon successful message sending.
 */
const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const { content } = req.body;
  if (
    !content &&
    !(Array.isArray(req.files) ? req.files.length : req.files?.attachments)
  ) {
    throw new ApiError(400, "Message content or attachment is required");
  }

  const selectedChat: ChatType | null = await Chat.findById(chatId);

  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const receivers = selectedChat.participants.filter(
    (participant) =>
      participant.userId !== (req as AuthenticatedRequest).user.id
  );
  if (!receivers) {
    throw new ApiError(400, "Unable to determine message receiver");
  }

  await Promise.all(
    receivers.map(async (user) => {
      if (!(await resilientApiCall(() => validateUser(user.userId)))) {
        throw new ApiError(400, `User ${user.userId} not found`);
      }
    })
  );

  let attachments: Express.Multer.File[] = [];
  if (!Array.isArray(req.files) && req.files?.attachments) {
    attachments = req.files.attachments;
  } else if (Array.isArray(req.files)) {
    attachments = req.files;
  }
  const messageFiles: AttachmentType[] = attachments.map((attachment) => ({
    url: getStaticFilePath(req, attachment.fieldname),
    localPath: getLocalPath(attachment.filename),
  }));

  const messgage: MessageType = await ChatMessage.create({
    sender: (req as AuthenticatedRequest).user.id,
    receivers,
    content: content || "",
    chat: new Types.ObjectId(chatId),
    attachments: messageFiles,
  });
  const updateChat = await Chat.findByIdAndUpdate(
    chatId,
    { $set: { lastMessage: messgage._id } },
    { new: true }
  );

  const messages: MessageType[] = await ChatMessage.aggregate([
    { $match: { _id: messgage._id } },
    ...chatMessageCommonAggregation(),
  ]);

  const receivedMessage = messages[0];

  if (!receivedMessage || !updateChat) {
    throw new ApiError(500, "Internal server error");
  }

  if (updateChat.type === "group") {
    emitSocketEvent(
      req,
      chatId,
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      receivedMessage
    );
  } else {
    updateChat?.participants.forEach((participant) => {
      if (participant.userId === (req as AuthenticatedRequest).user.id) return;
      emitSocketEvent(
        req,
        participant.userId,
        ChatEventEnum.MESSAGE_RECEIVED_EVENT,
        receivedMessage
      );
    });
  }

  await redisClient.del(`messages:${chatId}`);
  updateChat?.participants.forEach(async (participant) => {
    await redisClient.del(`chats:${participant}`);
  });

  res
    .status(201)
    .json(new ApiResponse(201, receivedMessage, "Message saved successfully"));
};

/**
 * Deletes a chat message if the authenticated user is the sender.
 *
 * This function performs the following operations:
 * - Validates that the chat exists and that the authenticated user is a participant.
 * - Retrieves the message by ID and checks if it exists.
 * - Verifies that the authenticated user is the sender of the message.
 * - If the message contains attachments, removes each associated local file.
 * - Deletes the message from the database.
 * - If the deleted message was the last message of the chat, updates the chat's last message.
 * - Emits a socket event to all other chat participants to notify them about the deletion.
 * - Sends a successful JSON response with the deleted message details.
 *
 * @param req - The Express request object containing chatId, messageId, and the authenticated user.
 * @param res - The Express response object used to send the result of the deletion.
 *
 * @throws {ApiError} 404 - If the chat or message does not exist.
 * @throws {ApiError} 403 - If the authenticated user is not authorized to delete the message.
 *
 * @returns {Promise<void>} A promise that resolves once the message deletion process is complete.
 */
const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;

  const chat: ChatType | null = await Chat.findOne({
    _id: new Types.ObjectId(chatId),
  });
  if (
    !chat ||
    !chat.participants.some(
      (participant) =>
        participant.userId === (req as AuthenticatedRequest).user.id
    )
  ) {
    throw new ApiError(404, "Chat does not exist");
  }

  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  if (message.sender !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "You are not authorised to delete this message");
  }

  if (message.attachments.length > 0) {
    message.attachments.forEach((asset) => {
      removeLocalFile(asset.localPath);
    });
  }

  await ChatMessage.deleteOne({ _id: message._id });

  if (
    chat.lastMessage?.toString() === (message._id as Types.ObjectId).toString()
  ) {
    const lastMessage = await ChatMessage.findOne(
      { chat: chatId },
      {},
      { sort: { createdAt: -1 } }
    );
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: lastMessage ? lastMessage._id : null,
    });
  }

  chat.participants.forEach((participant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      message
    );
  });

  await redisClient.del(`messages:${chatId}`);

  res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted successfully"));
};

/**
 * Handles replying to a specific message in a chat.
 *
 * This function retrieves the chat using the provided chatId and checks whether the reply content exists.
 * It then creates a reply message associated with the specified messageId and updates the chat's lastMessage.
 * After saving the chat, it emits a notification to all other participants in the chat to notify them about the new reply.
 *
 * @param req - Express request object containing parameters (chatId and messageId) and the reply content in the body.
 * @param res - Express response object used to return a JSON response with a status code.
 *
 * @throws {ApiError} - Throws a 400 error if the reply content is missing or if the receivers cannot be determined.
 * @throws {ApiError} - Throws a 404 error if the chat identified by chatId is not found.
 *
 * @returns {Promise<void>} - Resolves when the reply is sent successfully, returning a JSON response with the reply.
 */
const replyMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Reply content is required");
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  const receivers = chat.participants.filter(
    (participant) =>
      participant.userId !== (req as AuthenticatedRequest).user.id
  );
  if (!receivers) {
    throw new ApiError(400, "Unable to determine message receiver");
  }

  const reply = await ChatMessage.create({
    sender: (req as AuthenticatedRequest).user.id,
    receivers,
    content: content,
    chat: new Types.ObjectId(chatId),
    replyTo: messageId,
    attachments: [],
  });

  chat.lastMessage = reply._id as Types.ObjectId;
  await chat.save();

  chat.participants.forEach((participant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      reply
    );
  });

  await redisClient.del(`messages:${chatId}`);

  res.status(201).json(new ApiResponse(201, reply, "Reply sent successfully"));
};

/**
 * Updates the reaction of a user to a specific message.
 *
 * This function handles the addition, update, or removal of a reaction (emoji)
 * to a chat message. If the user has already reacted with the same emoji,
 * the reaction is removed. If the user has reacted with a different emoji,
 * the reaction is updated. If the user has not reacted yet, a new reaction is added.
 *
 * @param req - The request object containing the message ID in the URL parameters
 *              and the emoji in the request body.
 * @param res - The response object used to send back the updated message.
 *
 * @throws {ApiError} If the emoji is not provided in the request body.
 * @throws {ApiError} If the message with the given ID is not found.
 *
 * @returns {Promise<void>} A promise that resolves when the reaction is successfully updated.
 */
const updateReaction = async (req: Request, res: Response): Promise<void> => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    throw new ApiError(400, "Emoji is required for a reaction");
  }

  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const reactionIndex = message.reactions.findIndex(
    (reaction) => reaction.userId === (req as AuthenticatedRequest).user.id
  );

  if (reactionIndex !== -1) {
    if (message.reactions[reactionIndex].emoji === emoji) {
      message.reactions.splice(reactionIndex, 1);
    } else {
      message.reactions[reactionIndex].emoji = emoji;
    }
  } else {
    message.reactions.push({
      userId: (req as AuthenticatedRequest).user.id,
      emoji,
    });
  }

  await message.save();
  res
    .status(200)
    .json(new ApiResponse(200, message, "Reaction updated successfully"));
};

export {
  getAllMessages,
  sendMessage,
  deleteMessage,
  replyMessage,
  updateReaction,
};
