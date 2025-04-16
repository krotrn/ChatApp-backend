import { Chat } from "../models/chat.models";
import { ChatMessage } from "../models/message.models";
import {
  AttachmentType,
  MessageType,
  StatusEnum,
  ReactionType,
  ReadByType,
  User,
  MessageResponseType,
} from "../types/message";
import type { ChatParticipant, ChatType } from "../types/chat";
import type { AuthenticatedRequest } from "../types/request";
import ApiError from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { getLocalPath, removeLocalFile } from "../utils/fileOperations";
import { getStaticFilePath } from "../utils/fileOperations";
import { validateUser } from "../utils/userHelper";
import { validateMessageInput } from "../utils/validators";
import type { Request, Response } from "express";
import { Types, startSession } from "mongoose";
import { emitSocketEvent } from "../socket";
import { ChatEventEnum } from "../utils/constants";

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
        edits: 1,
        readBy: 1,
        deletedFor: 1,
        replyToId: 1,
        formatting: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $addFields: {
        _id: { $toString: "$_id" },
        chatId: { $toString: "$chatId" },
        replyToId: {
          $cond: {
            if: { $ne: ["$replyToId", null] },
            then: { $toString: "$replyToId" },
            else: null,
          },
        },
        formatting: {
          $cond: {
            if: { $ne: ["$formatting", null] },
            then: "$formatting",
            else: {},
          },
        },
      },
    },
  ];
};

// get all messages
const getAllMessages = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;

  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist.");
  }

  if (
    !selectedChat.participants.some(
      (participant: User) =>
        participant.userId === (req as AuthenticatedRequest).user.id
    )
  ) {
    throw new ApiError(400, "User is not part of chat.");
  }

  const messages: MessageResponseType[] = await ChatMessage.aggregate([
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

// send message
const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const { chatId } = req.params;
    const { content }: { content: string } = req.body;

    let attachments: Express.Multer.File[] = [];
    if (!Array.isArray(req.files) && req.files?.attachments) {
      attachments = req.files.attachments;
    } else if (Array.isArray(req.files)) {
      attachments = req.files;
    }

    validateMessageInput(content, attachments);

    const selectedChat: ChatType | null = await Chat.findById(chatId);
    if (!selectedChat) {
      throw new ApiError(404, "Chat does not exist");
    }

    const receivers: User[] = selectedChat.participants
      .filter(
        (participant) =>
          participant.userId !== (req as AuthenticatedRequest).user.id
      )
      .map((participant: ChatParticipant) => ({
        userId: participant.userId,
        name: participant.name,
        avatarUrl: participant.avatarUrl,
      }));
    if (!receivers.length) {
      throw new ApiError(400, "Unable to determine message receiver");
    }

    const receiverIds = receivers.map((user) => user.userId);
    const validReceivers = await validateUser(receiverIds);
    if (validReceivers.length !== receiverIds.length) {
      throw new ApiError(400, "One or more receivers are invalid");
    }

    const messageFiles: AttachmentType[] = attachments.map((attachment) => ({
      name: attachment.filename,
      url: getStaticFilePath(req, attachment.filename),
      localPath: getLocalPath(attachment.filename),
      type: attachment.mimetype || "application/octet-stream",
      status: StatusEnum.sent,
    }));

    const sender: User = {
      userId: (req as AuthenticatedRequest).user.id,
      name: (req as AuthenticatedRequest).user.name,
      avatarUrl: (req as AuthenticatedRequest).user.avatarUrl,
    };

    const message = await ChatMessage.create(
      [
        {
          sender,
          receivers,
          chatId: new Types.ObjectId(chatId),
          content: content || "",
          attachments: messageFiles,
          status: StatusEnum.sent,
        },
      ],
      { session }
    );

    const updateChat = await Chat.findByIdAndUpdate(
      chatId,
      { $set: { lastMessage: message[0]._id } },
      { new: true, session }
    );

    const messages: MessageResponseType[] = await ChatMessage.aggregate([
      { $match: { _id: message[0]._id } },
      ...chatMessageCommonAggregation(),
    ]).session(session);

    const receivedMessage = messages[0];
    if (!receivedMessage || !updateChat) {
      throw new ApiError(500, "Internal server error");
    }
    await session.commitTransaction();

    if (updateChat.type === "group") {
      emitSocketEvent(
        req,
        chatId,
        ChatEventEnum.MESSAGE_RECEIVED_EVENT,
        receivedMessage
      );
    } else {
      for (const participant of updateChat.participants) {
        if (participant.userId === (req as AuthenticatedRequest).user.id)
          continue;
        emitSocketEvent(
          req,
          participant.userId,
          ChatEventEnum.MESSAGE_RECEIVED_EVENT,
          receivedMessage
        );
      }
    }

    res
      .status(201)
      .json(
        new ApiResponse(201, receivedMessage, "Message saved successfully")
      );
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// delete message
const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const { chatId, messageId } = req.params;
    const currentUser = (req as AuthenticatedRequest).user;

    const chat: ChatType | null = await Chat.findById(chatId);
    if (
      !chat ||
      !chat.participants.some(
        (participant) => participant.userId === currentUser.id
      )
    ) {
      throw new ApiError(404, "Chat does not exist");
    }

    const message: MessageType | null = await ChatMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message does not exist");
    }
    const isAdmin = chat.admin === currentUser.id;
    const isSender = message.sender.userId === currentUser.id;
    const isRecent =
      Date.now() - message.createdAt.getTime() < 24 * 60 * 60 * 1000;

    if (!isAdmin && !isSender) {
      throw new ApiError(403, "You are not authorized to delete this message");
    }

    if (!isAdmin && !isRecent) {
      throw new ApiError(
        403,
        "You can only delete messages less than 24 hours old"
      );
    }

    if (message.attachments.length > 0) {
      for (const asset of message.attachments) {
        try {
          await removeLocalFile(asset.localPath);
        } catch (error) {
          console.error(`Failed to delete file: ${asset.localPath}`, error);
        }
      }
    }

    await ChatMessage.deleteOne({ _id: message._id }, { session });

    if (chat.lastMessage?.toString() === message._id.toString()) {
      const lastMessage = await ChatMessage.findOne(
        { chatId },
        {},
        { sort: { createdAt: -1 } }
      );
      await Chat.findByIdAndUpdate(
        chatId,
        {
          lastMessage: lastMessage ? lastMessage._id : null,
        },
        { session }
      );
    }

    await session.commitTransaction();

    for (const participant of chat.participants) {
      if (participant.userId === currentUser.id) continue;
      await emitSocketEvent(
        req,
        participant.userId,
        ChatEventEnum.MESSAGE_DELETE_EVENT,
        message
      );
    }

    res
      .status(200)
      .json(new ApiResponse(200, message, "Message deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const deleteMessageForMe = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId, messageId } = req.params;
  const currentUser = (req as AuthenticatedRequest).user;

  const chat: ChatType | null = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const message: MessageType | null = await ChatMessage.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  const isParticipant = chat.participants.some(
    (participant) => participant.userId === currentUser.id
  );
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  if (
    message.deletedFor.some(
      (deletedForPerson) => deletedForPerson.userId === currentUser.id
    )
  ) {
    throw new ApiError(400, "Message already deleted for you");
  }

  message.deletedFor.push({
    userId: currentUser.id,
    deletedAt: new Date(),
  });

  await message.save();

  emitSocketEvent(
    req,
    currentUser.id,
    ChatEventEnum.MESSAGE_DELETE_EVENT,
    message
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, message, "Message deleted for you successfully")
    );
};

// reply message
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
    (participant: User) =>
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

  chat.participants.forEach((participant: User) => {
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

// update message
const updateReaction = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;
  const { emoji }: { emoji: string } = req.body;

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
    (reaction: ReactionType) =>
      reaction.userId === (req as AuthenticatedRequest).user.id
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
      timestamp: new Date(),
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

// Edit Message
const editMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    // Validate chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }

    const isParticipant = chat.participants.some(
      (participant: User) => participant.userId === userId
    );
    if (!isParticipant) {
      throw new ApiError(403, "You are not a participant in this chat");
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    if (message.chatId.toString() !== chatId) {
      throw new ApiError(400, "Message does not belong to this chat");
    }

    if (message.sender !== userId) {
      throw new ApiError(403, "You can only edit your own messages");
    }

    if (message.deletedFor.includes(userId)) {
      throw new ApiError(400, "Cannot edit a deleted message");
    }

    // Update the message
    const previousContent = message.content;
    message.content = content;
    message.edited.isEdited = true;
    message.edited.editedAt = new Date();

    if (!message.edited.previousContent) {
      message.edited.previousContent = [];
    }
    message.edited.previousContent.push(previousContent);

    message.edits = message.edits || [];
    message.edits.push({
      content: previousContent,
      editedAt: new Date(),
      editedBy: userId,
    });

    await message.save();
    emitSocketEvent(req, chatId, ChatEventEnum.MESSAGE_EDITED_EVENT, {
      messageId: message._id,
      content,
      chatId,
      editedAt: message.edited.editedAt,
    });

    res
      .status(200)
      .json(new ApiResponse(200, message, "Message edited successfully"));
  } catch (error) {
    throw error;
  }
};


const markMessagesAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { messageIds } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }

    const isParticipant = chat.participants.some(
      (participant: User) => participant.userId === userId
    );
    if (!isParticipant) {
      throw new ApiError(403, "You are not a participant in this chat");
    }

    let messages;
    if (!messageIds || messageIds.length === 0) {
      messages = await ChatMessage.find({
        chatId,
        isDeleted: false,
        sender: { $ne: userId },
        readBy: { $not: { $elemMatch: { userId } } }, 
      });
    } else {
      // Find specific messages by IDs
      messages = await ChatMessage.find({
        _id: { $in: messageIds },
        chatId,
        isDeleted: false,
      });
    }

    if (messages.length === 0) {
      res
        .status(200)
        .json(new ApiResponse(200, [], "No messages to mark as read"));
    }

    const readAt = new Date();
    const updatePromises = messages.map(async (message) => {
      if (
        message.sender === userId ||
        message.readBy.some((read: ReadByType) => read.userId === userId)
      ) {
        return message;
      }

      // Add user to readBy array
      message.readBy.push({
        userId,
        readAt,
      });

      return message.save();
    });

    await Promise.all(updatePromises);

    emitSocketEvent(req, chatId, ChatEventEnum.MESSAGE_READ_EVENT, {
      chatId,
      readBy: {
        userId,
        readAt,
      },
      messageIds: messages.map((message) => message._id),
    });

    // Return success response
    res
      .status(200)
      .json(new ApiResponse(200, messages, "Messages marked as read"));
  } catch (error) {
    throw error;
  }
};

export {
  getAllMessages,
  sendMessage,
  deleteMessage,
  replyMessage,
  updateReaction,
  editMessage,
  markMessagesAsRead,
  deleteMessageForMe,
};
