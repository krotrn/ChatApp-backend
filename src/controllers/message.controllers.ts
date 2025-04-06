import { Request, Response } from "express";
import { Types } from "mongoose";
import { Chat } from "../models/chat.models";
import ApiError from "../utils/ApiError";
import { AuthenticatedRequest } from "../types/request.type";
import { AttachmentType, MessageType, ReactionType } from "../types/message.type";
import { ChatMessage } from "../models/message.models";
import { ApiResponse } from "../utils/ApiResponse";
import {
  getLocalPath,
  getStaticFilePath,
  removeLocalFile,
} from "../utils/FileOperations";
import { emitSocketEvent } from "../socket";
import { ChatEventEnum } from "../utils/constants";
import { ChatParticipant, ChatType } from "../types/chat.type";
import { validateUser } from "../utils/userHelper";
import { resilientApiCall } from "../utils/apiRetry";

export const chatMessageCommonAggregation = () => {
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
    {
      $addFields: {
        _id: { $toString: "$_id" },
        chatId: { $toString: "$chatId" },
        replyTo: {
          $cond: {
            if: { $ne: ["$replyTo", null] },
            then: { $toString: "$replyTo" },
            else: null,
          },
        },
      },
    }
  ];
};

const getAllMessages = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;

  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist.");
  }

  if (
    !selectedChat.participants.some(
      (participant: ChatParticipant) =>
        participant.userId === (req as AuthenticatedRequest).user.id
    )
  ) {
    throw new ApiError(400, "User is not part of chat.");
  }

  const messages: MessageType[] = await ChatMessage.aggregate([
    {
      $match: {
        chatId: new Types.ObjectId(chatId),
      },
    },
    ...chatMessageCommonAggregation(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, messages, "Messages fetched successfully"));
};

const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const { content }: { content: string; } = req.body;
  const hasAttachments =
    req.files &&
    (Array.isArray(req.files)
      ? req.files.length > 0
      : req.files.attachments && req.files.attachments.length > 0);
  if (!content && !hasAttachments) {
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
  if (!receivers.length) {
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
    name: attachment.filename,
    url: getStaticFilePath(req, attachment.filename),
    localPath: getLocalPath(attachment.filename),
    type: attachment.mimetype || "application/octet-stream"
  }));

  const message: MessageType = await ChatMessage.create({
    sender: (req as AuthenticatedRequest).user.id,
    receivers,
    content: content || "",
    chatId: new Types.ObjectId(chatId),
    attachments: messageFiles,
  });
  const updateChat = await Chat.findByIdAndUpdate(
    chatId,
    { $set: { lastMessage: message._id } },
    { new: true }
  );

  const messages: MessageType[] = await ChatMessage.aggregate([
    { $match: { _id: message._id } },
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
    updateChat.participants.forEach((participant: ChatParticipant) => {
      if (participant.userId === (req as AuthenticatedRequest).user.id) return;
      emitSocketEvent(
        req,
        participant.userId,
        ChatEventEnum.MESSAGE_RECEIVED_EVENT,
        receivedMessage
      );
    });
  }

  res
    .status(201)
    .json(new ApiResponse(201, receivedMessage, "Message saved successfully"));
};

const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;

  const chat: ChatType | null = await Chat.findById(chatId);
  if (
    !chat ||
    !chat.participants.some(
      (participant) =>
        participant.userId === (req as AuthenticatedRequest).user.id
    )
  ) {
    throw new ApiError(404, "Chat does not exist");
  }

  const message: MessageType | null = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  if (message.sender !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "You are not authorised to delete this message");
  }

  if (message.attachments.length > 0) {
    await Promise.all(
      message.attachments.map(
        async (asset) => await removeLocalFile(asset.localPath)
      )
    );
  }

  await ChatMessage.deleteOne({ _id: message._id });

  if (
    chat.lastMessage?.toString() === (message._id as Types.ObjectId).toString()
  ) {
    const lastMessage = await ChatMessage.findOne(
      { chatId },
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

  res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted successfully"));
};

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
    (participant: ChatParticipant) =>
      participant.userId !== (req as AuthenticatedRequest).user.id
  );
  if (!receivers.length) {
    throw new ApiError(400, "Unable to determine message receiver");
  }

  const reply = await ChatMessage.create({
    sender: (req as AuthenticatedRequest).user.id,
    receivers,
    content,
    chatId: new Types.ObjectId(chatId),
    replyTo: messageId,
    attachments: [],
  });

  chat.lastMessage = reply._id;
  await chat.save();

  chat.participants.forEach((participant: ChatParticipant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      reply
    );
  });

  res.status(201).json(new ApiResponse(201, reply, "Reply sent successfully"));
};

const updateReaction = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;
  const { emoji }: { emoji: string; } = req.body;

  if (!emoji) {
    throw new ApiError(400, "Emoji is required for a reaction");
  }

  const chat: ChatType | null = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const reactionIndex = message.reactions.findIndex(
    (reaction: ReactionType) => reaction.userId === (req as AuthenticatedRequest).user.id
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
      timestamp: new Date()
    });
  }
  await message.save();

  chat.participants.forEach((participant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.MESSAGE_REACTION_EVENT,
      message
    );
  });

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
