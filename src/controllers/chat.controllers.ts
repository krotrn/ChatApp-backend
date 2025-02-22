import { PipelineStage, Types } from "mongoose";
import "../types/express";
import { ChatMessage } from "../models/message.models";
import { removeLocalFile } from "../utils/FileOperations";
import { Request, Response } from "express";
import { Chat } from "../models/chat.models";
import ApiError from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { ChatType } from "../types/Chat.type";
import { AuthenticatedRequest, CreateChatRequest } from "../types/request.type";
import { emitSocketEvent } from "../socket";
import { ChatEventEnum } from "../utils/constants";
import { AttachmentType, MessageType } from "../types/Message.type";

/**
 * Generates a common aggregation pipeline for chat-related queries.
 *
 * This pipeline performs the following operations:
 * 1. `$lookup`: Joins the `chatmessages` collection with the current collection based on the `lastMessage` field.
 * 2. `$addFields`: Adds the first element of the `lastMessage` array to the document.
 *
 * @returns {PipelineStage[]} An array of aggregation pipeline stages.
 */
const chatCommonAggregation = (): PipelineStage[] => {
  return [
    {
      $lookup: {
        from: "chatmessages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessage",
      },
    },
    {
      $addFields: {
        lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
      },
    },
  ];
};

/**
 * Deletes all chat messages associated with a given chat ID and removes their local file attachments.
 *
 * @param {string} chatId - The ID of the chat whose messages are to be deleted.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 *
 * @async
 * @function deleteCascadeChatMessages
 *
 * @example
 * // Deletes all messages and their attachments for the specified chat ID
 * await deleteCascadeChatMessages('60d21b4667d0d8992e610c85');
 */
const deleteCascadeChatMessages = async (chatId: string): Promise<void> => {
  const messages: MessageType[] = await ChatMessage.find({
    chat: new Types.ObjectId(chatId),
  });

  const attachments: AttachmentType[] = [];
  messages.forEach((message) => {
    attachments.push(...message.attachments);
  });
  attachments.forEach((attachment) => {
    removeLocalFile(attachment.localPath);
  });

  await ChatMessage.deleteMany({
    chat: new Types.ObjectId(chatId),
  });
};

/**
 * Creates or retrieves a one-on-one chat between the authenticated user and the specified receiver.
 *
 * @param req - The request object, which includes the authenticated user's information and the receiver's ID.
 * @param res - The response object used to send back the appropriate response.
 *
 * @throws {ApiError} If the user attempts to chat with themselves or if there is an internal server error.
 *
 * @returns {Promise<void>} A promise that resolves to Response.
 *
 * The function performs the following steps:
 * 1. Checks if the receiverId is the same as the authenticated user's ID and throws an error if true.
 * 2. Searches for an existing direct chat between the authenticated user and the receiver.
 * 3. If a chat exists, returns the chat details in the response.
 * 4. If no chat exists, creates a new one-on-one chat and returns the new chat details in the response.
 * 5. Emits a socket event to notify the receiver of the new chat.
 */
const createOrGetAOneOnOneChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { participants, name } = (req as CreateChatRequest).body;

  if (participants.length !== 1) {
    throw new ApiError(400, "Invalid participants.");
  }

  if (participants[0] === (req as AuthenticatedRequest).user._id) {
    throw new ApiError(400, "You cannot chat with yourself");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        type: "direct",
        $and: [
          {
            participants: {
              $elemMatch: { $eq: (req as AuthenticatedRequest).user._id },
            },
          },
          { participants: { $elemMatch: { $eq: participants[0] } } },
        ],
      },
    },
    ...chatCommonAggregation(),
  ]);

  if (chat.length) {
    res
      .status(200)
      .json(new ApiResponse(200, chat[0], "chat retrived successfully"));
    return;
  }

  const newChatInstance = await Chat.create({
    name,
    participants: [(req as AuthenticatedRequest).user._id, participants[0]],
    admin: (req as AuthenticatedRequest).user._id,
    createdBy: (req as AuthenticatedRequest).user._id,
  });
  const createChat = await Chat.aggregate([
    { $match: { _id: newChatInstance._id } },
    ...chatCommonAggregation(),
  ]);

  const payload: ChatType = createChat[0];
  if (!payload) {
    throw new ApiError(500, "Internal Server error");
  }

  payload.participants.forEach((participant) => {
    if (participant === (req as AuthenticatedRequest).user._id) return;
    emitSocketEvent(req, participant, ChatEventEnum.NEW_CHAT_EVENT, payload);
  });

  res
    .status(201)
    .json(new ApiResponse(201, payload, "Chat retrieved successfully"));
  return;
};

/**
 * Creates a new group chat.
 *
 * @param req - The request object containing the chat details.
 * @param res - The response object to send the result.
 * @throws {ApiError} If the participants array contains the group creator.
 * @throws {ApiError} If there are duplicate participants.
 * @throws {ApiError} If the payload is not created successfully.
 * @returns {Promise<void>} A response with the created group chat details.
 */
const createAGroupChat = async (req: Request, res: Response): Promise<void> => {
  const { name, participants } = (req as CreateChatRequest).body;
  if (participants.includes((req as AuthenticatedRequest).user._id)) {
    throw new ApiError(
      400,
      "Participants array should not contain the group creator"
    );
  }

  const member = [
    ...new Set([...participants, (req as AuthenticatedRequest).user._id]),
  ];

  if (member.length < 3) {
    throw new ApiError(
      400,
      "Seems like you have passed duplicate participants."
    );
  }

  const groupChat: ChatType = await Chat.create({
    name,
    type: "group",
    participants: member,
    admin: (req as AuthenticatedRequest).user._id,
    createdBy: (req as AuthenticatedRequest).user._id,
  });

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: groupChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload: ChatType = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  payload?.participants?.forEach((participant) => {
    if (participant === (req as AuthenticatedRequest).user._id) return;
    emitSocketEvent(req, participant, ChatEventEnum.NEW_CHAT_EVENT, payload);
  });

  res
    .status(201)
    .json(new ApiResponse(201, payload, "Group chat created successfully"));
  return;
};

/**
 * Retrieves the details of a group chat based on the provided chat ID.
 *
 * @param req - The request object containing the chat ID in the parameters.
 * @param res - The response object used to send the response back to the client.
 * @returns {Promise<void>} A JSON response containing the group chat details if found, or an error if the group chat does not exist.
 * @throws {ApiError} If the group chat does not exist.
 */
const getGroupChatDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(chatId),
        type: "group",
      },
    },
    ...chatCommonAggregation(),
  ]);
  const chat = groupChat[0];

  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  res
    .status(200)
    .json(new ApiResponse(200, chat, "Group chat fetched successfully"));
  return;
};

/**
 * Renames a group chat.
 *
 * @param req - The request object containing the chat ID in the parameters and the new name in the body.
 * @param res - The response object used to send the response back to the client.
 * @throws {ApiError} If the group chat does not exist, if the user is not an admin, or if the group chat name cannot be updated.
 * @returns {Promise<void>} A JSON response with the updated group chat information.
 */
const renameGroupChat = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const { name } = req.body;
  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId),
    type: "group",
  });
  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }
  if (groupChat.admin !== (req as AuthenticatedRequest).user._id) {
    throw new ApiError(403, "You are not an admin");
  }
  const updatedGroupChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        name,
      },
    },
    { new: true }
  );

  if (!updatedGroupChat) {
    throw new ApiError(404, "Cannot update name of group chat.");
  }
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedGroupChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload: ChatType = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  payload?.participants?.forEach((participant) => {
    emitSocketEvent(
      req,
      participant,
      ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
      payload
    );
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, chat[0], "Group chat name updated successfully")
    );
  return;
};

/**
 * Deletes a group chat.
 *
 * @param {Request} req - The request object containing the chat ID in the parameters.
 * @param {Response} res - The response object to send the result of the deletion.
 * @throws {ApiError} - Throws a 404 error if the group chat does not exist.
 * @throws {ApiError} - Throws a 403 error if the user is not the admin of the group chat.
 * @returns {Promise<void>} - Returns a response indicating the group chat was deleted successfully.
 */
const deleteGroupChat = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;

  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(chatId),
        type: "group",
      },
    },
    ...chatCommonAggregation(),
  ]);

  const chat: ChatType = groupChat[0];

  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }
  if (chat.admin !== (req as AuthenticatedRequest).user._id) {
    throw new ApiError(403, "Only admin can delete the group");
  }

  await Chat.findByIdAndDelete(chatId);

  await deleteCascadeChatMessages(chatId);

  chat?.participants?.forEach((participant) => {
    if (participant === (req as AuthenticatedRequest).user._id) return;
    emitSocketEvent(req, participant, ChatEventEnum.LEAVE_CHAT_EVENT, chat);
  });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Group chat deleted successfully"));
  return;
};

/**
 * Handles the request to leave a group chat.
 *
 * @param req - The request object containing the chat ID in the parameters.
 * @param res - The response object used to send the response back to the client.
 *
 * @throws {ApiError} If the group chat does not exist.
 * @throws {ApiError} If the user is not a part of the group chat.
 * @throws {ApiError} If the group chat cannot be updated.
 * @throws {ApiError} If there is an internal server error.
 *
 * @returns {Promise<void>} A response indicating the user has successfully left the group chat.
 */
const leaveGroupChat = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId),
    type: "group",
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  const existingParticipants = groupChat.participants;

  if (!existingParticipants?.includes((req as CreateChatRequest).user?._id)) {
    throw new ApiError(400, "You are not a part of this group chat");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: (req as CreateChatRequest).user?._id,
      },
    },
    { new: true }
  );
  if (!updatedChat) {
    throw new ApiError(404, "Cannot leave group.");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Left a group successfully"));
  return;
};

/**
 * Deletes a one-on-one chat.
 *
 * This function handles the deletion of a one-on-one chat by its chat ID. It performs the following steps:
 * 1. Aggregates the chat data using the provided chat ID.
 * 2. Checks if the chat exists; if not, throws a 404 error.
 * 3. Deletes the chat by its ID.
 * 4. Deletes all messages associated with the chat.
 * 5. Finds the other participant in the chat.
 * 6. Emits a socket event to notify the other participant about the chat deletion.
 * 7. Sends a success response to the client.
 *
 * @param req - The request object containing the chat ID in the parameters and the user information.
 * @param res - The response object used to send the status and JSON response.
 * @throws {ApiError} - Throws a 404 error if the chat or the other participant does not exist.
 * @returns {Promise<void>} - Returns a promise that resolves when the chat is successfully deleted.
 */
const deleteOneOnOneChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(chatId),
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload: ChatType = chat[0];

  if (!payload) {
    throw new ApiError(404, "Chat does not exist");
  }

  await Chat.findByIdAndDelete(chatId);

  await deleteCascadeChatMessages(chatId);

  const otherParticipant = payload?.participants?.find(
    (participant) =>
      participant !== (req as AuthenticatedRequest).user._id.toString()
  );

  if (!otherParticipant) {
    throw new ApiError(404, "Other user not found.");
  }
  emitSocketEvent(
    req,
    otherParticipant,
    ChatEventEnum.LEAVE_CHAT_EVENT,
    payload
  );

  res.status(200).json(new ApiResponse(200, {}, "Chat deleted successfully"));
  return;
};

/**
 * Adds a new participant to a group chat.
 *
 * @param req - The request object containing the chatId and participantId in the params.
 * @param res - The response object used to send the response.
 * @throws {ApiError} If the group chat does not exist.
 * @throws {ApiError} If the user is not an admin of the group chat.
 * @throws {ApiError} If the participant is already in the group chat.
 * @throws {ApiError} If the group chat cannot be updated.
 * @throws {ApiError} If there is an internal server error.
 * @returns {Promise<void>} A JSON response with the updated chat information and a success message.
 */
const addNewParticipantInGroupChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId, participantId } = req.params;

  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId as string),
    type: "group",
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (groupChat.admin !== (req as AuthenticatedRequest).user._id) {
    throw new ApiError(403, "You are not an admin");
  }

  const existingParticipants = groupChat.participants;

  if (existingParticipants?.includes(participantId)) {
    throw new ApiError(409, "Participant already in a group chat");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: {
        participants: participantId,
      },
    },
    { new: true }
  );

  if (!updatedChat) {
    throw new ApiError(404, "Cannot join group.");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }
  emitSocketEvent(req, participantId, ChatEventEnum.NEW_CHAT_EVENT, payload);

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant added successfully"));
  return;
};

/**
 * Removes a participant from a group chat.
 *
 * @param req - The request object containing the chat ID and participant ID in the parameters.
 * @param res - The response object used to send the response back to the client.
 * @throws {ApiError} - Throws a 404 error if the group chat does not exist.
 * @throws {ApiError} - Throws a 403 error if the requesting user is not an admin of the group chat.
 * @throws {ApiError} - Throws a 400 error if the participant does not exist in the group chat.
 * @throws {ApiError} - Throws a 404 error if the chat could not be updated.
 * @throws {ApiError} - Throws a 500 error if there is an internal server error.
 * @returns {Promise<void>} - Returns a response with a status of 200 and a message indicating the participant was removed successfully.
 */
const removeParticipantFromGroupChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId, participantId } = req.params;

  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId),
    type: "group",
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (groupChat.admin !== (req as AuthenticatedRequest).user._id) {
    throw new ApiError(403, "You are not an admin");
  }

  const existingParticipants = groupChat.participants;

  if (!existingParticipants?.includes(participantId)) {
    throw new ApiError(400, "Participant does not exist in the group chat");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: participantId,
      },
    },
    { new: true }
  );

  if (!updatedChat) {
    throw new ApiError(404, "Cannot kick from group.");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  emitSocketEvent(req, participantId, ChatEventEnum.LEAVE_CHAT_EVENT, payload);

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant removed successfully"));
  return;
};

/**
 * Retrieves all chat conversations for the authenticated user.
 *
 * This function uses MongoDB aggregation to fetch all chat documents
 * where the authenticated user is a participant. The chats are sorted
 * by the `updatedAt` field in descending order and additional common
 * aggregation stages are applied.
 *
 * @param req - The request object, extended to include the authenticated user's information.
 * @param res - The response object used to send back the HTTP response.
 *
 * @returns {Promise<void>} A JSON response containing the status code, the list of chats, and a success message.
 */
const getAllChats = async (req: Request, res: Response): Promise<void> => {
  const chats = await Chat.aggregate([
    {
      $match: {
        participants: {
          $elemMatch: { $eq: (req as AuthenticatedRequest).user._id },
        },
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    ...chatCommonAggregation(),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(200, chats || [], "User chats fetched successfully!")
    );
  return;
};

/**
 * Pins a message in a chat.
 *
 * @param {Request} req - The request object containing chatId and messageId in params.
 * @param {Response} res - The response object to send the result.
 * @throws {ApiError} 404 - If the chat is not found.
 * @throws {ApiError} 403 - If the user is not the admin of the chat.
 * @returns {Promise<void>} - A promise that resolves when the message is pinned successfully.
 */
const pinMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }
  if (chat.admin !== (req as AuthenticatedRequest).user._id) {
    throw new ApiError(403, "Only admin can pin messages");
  }
  if (!chat.metadata) {
    chat.metadata = { pinnedMessage: [] };
  }
  if (!chat.metadata.pinnedMessage.includes(new Types.ObjectId(messageId))) {
    chat.metadata.pinnedMessage.push(new Types.ObjectId(messageId));
  }
  await chat.save();
  res
    .status(200)
    .json(new ApiResponse(200, chat, "Message pinned successfully"));
};

/**
 * Unpins a message from a chat.
 *
 * @param req - The request object containing the chatId and messageId in the parameters.
 * @param res - The response object used to send the response back to the client.
 * @throws {ApiError} If the chat is not found (404) or if the user is not the admin (403).
 * @throws {ApiError} If there is no pinned message found (400).
 * @returns {Promise<void>} A promise that resolves when the message is successfully unpinned.
 */
const unpinMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }
  if (chat.admin !== (req as AuthenticatedRequest).user._id) {
    throw new ApiError(403, "Only admin can unpin messages");
  }
  if (chat.metadata) {
    chat.metadata.pinnedMessage = chat.metadata.pinnedMessage.filter(
      (id) => id.toString() !== messageId
    );
    await chat.save();
    res
      .status(200)
      .json(new ApiResponse(200, chat, "Message unpinned successfully"));
  } else {
    throw new ApiError(400, "No pinned message found");
  }
};

export {
  chatCommonAggregation,
  deleteCascadeChatMessages,
  createOrGetAOneOnOneChat,
  createAGroupChat,
  deleteGroupChat,
  renameGroupChat,
  getGroupChatDetails,
  leaveGroupChat,
  addNewParticipantInGroupChat,
  getAllChats,
  removeParticipantFromGroupChat,
  deleteOneOnOneChat,
  pinMessage,
  unpinMessage,
};
