import { Chat } from "../../models/chat.models";
import { ChatMessage } from "../../models/message.models";
import {
  AttachmentType,
  MessageType,
  StatusEnum,
  ReactionType,
  ReadByType,
  User,
  MessageResponseType,
} from "../../types/message";
import type {
  ChatParticipant,
  ChatType,
  DeletedForEntry,
} from "../../types/chat";
import ApiError from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { validateUser } from "../../utils/userHelper";
import { validateMessageInput } from "../../utils/validators";
import type { Request, Response } from "express";
import { Types, startSession } from "mongoose";
import { emitSocketEvent } from "../../socket";
import { ChatEventEnum } from "../../utils/constants";
import { chatMessageCommonAggregation } from "./aggregations";

// Get all messages
export const getAllMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId } = req.params;
  const { page = "1", limit = "50", before, after } = req.query;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  if (
    isNaN(pageNumber) ||
    isNaN(limitNumber) ||
    pageNumber < 1 ||
    limitNumber < 1
  ) {
    throw new ApiError(400, "Invalid pagination parameters");
  }

  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist.");
  }

  if (
    !selectedChat.participants.some(
      (participant: User) => participant.userId === currentUser.id,
    )
  ) {
    throw new ApiError(400, "User is not part of chat.");
  }

  const filter: {
    chatId: Types.ObjectId;
    deletedFor?: { $not: { $elemMatch: { userId: string } } };
    createdAt?: { $lt?: Date; $gt?: Date };
  } = {
    chatId: new Types.ObjectId(chatId),
    deletedFor: { $not: { $elemMatch: { userId: currentUser.id } } },
  };

  if (before) {
    filter.createdAt = { $lt: new Date(before as string) };
  } else if (after) {
    filter.createdAt = { $gt: new Date(after as string) };
  }

  const skip = (pageNumber - 1) * limitNumber;

  const messages: MessageResponseType[] = await ChatMessage.aggregate([
    { $match: filter },
    ...chatMessageCommonAggregation(),
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limitNumber },
  ]);

  const total = await ChatMessage.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        messages,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          hasMore: total > skip + limitNumber,
        },
      },
      "Messages fetched successfully",
    ),
  );
};

// Send message
export const sendMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const { chatId } = req.params;
    const {
      content,
      replyToId,
      attachments,
    }: { content: string; replyToId?: string; attachments?: AttachmentType[] } =
      req.body;
    const currentUser = req.user;
    if (!currentUser) {
      res.status(400).json(new ApiError(400, "User not Found"));
      return;
    }
    validateMessageInput(content, attachments);

    const selectedChat: ChatType | null = await Chat.findById(chatId);
    if (!selectedChat) {
      throw new ApiError(404, "Chat does not exist");
    }

    const receivers: User[] = selectedChat.participants
      .filter((participant) => participant.userId !== currentUser.id)
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

    const sender: User = {
      userId: currentUser.id,
      name: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
    };

    const currentDate = new Date();
    const messageData: Partial<MessageType> = {
      sender,
      receivers,
      chatId: new Types.ObjectId(chatId),
      content: content.trim(),
      attachments,
      status: StatusEnum.SENT,
      edited: { isEdited: false, editedAt: currentDate },
      replyToId: replyToId ? new Types.ObjectId(replyToId) : undefined,
    };

    if (replyToId) {
      if (!replyToId || !Types.ObjectId.isValid(replyToId)) {
        throw new ApiError(400, "Invalid replyToId");
      }
      const originalMessage: MessageType | null = await ChatMessage.findOne({
        _id: { $eq: new Types.ObjectId(replyToId) },
      });
      if (!originalMessage) {
        throw new ApiError(404, "Referenced message does not exist");
      }
      messageData.replyToId = new Types.ObjectId(replyToId);
    } else {
      delete messageData.replyToId;
    }

    const message = await ChatMessage.create([messageData], { session });

    const updateChat = await Chat.findByIdAndUpdate(
      chatId,
      { $set: { lastMessage: message[0]._id } },
      { new: true, session },
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
        receivedMessage,
      );
    } else {
      for (const participant of updateChat.participants) {
        if (participant.userId === currentUser.id) continue;
        emitSocketEvent(
          req,
          participant.userId,
          ChatEventEnum.MESSAGE_RECEIVED_EVENT,
          receivedMessage,
        );
      }
    }

    res
      .status(201)
      .json(
        new ApiResponse(201, receivedMessage, "Message saved successfully"),
      );
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Delete message
export const deleteMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const { chatId, messageId } = req.params;
    const currentUser = req.user;
    if (!currentUser) {
      res.status(400).json(new ApiError(400, "User not Found"));
      return;
    }

    const chat: ChatType | null = await Chat.findById(chatId).session(session);
    if (
      !chat ||
      !chat.participants.some(
        (participant) => participant.userId === currentUser.id,
      )
    ) {
      throw new ApiError(404, "Chat does not exist");
    }

    const message: MessageType | null =
      await ChatMessage.findById(messageId).session(session);
    if (!message) {
      throw new ApiError(404, "Message does not exist");
    }
    const isAdmin = chat.admin === currentUser.id;
    const isSender = message.sender.userId === currentUser.id;

    // Check if user has permission to delete
    if (!isAdmin && !isSender) {
      throw new ApiError(
        403,
        "You don't have permission to delete this message",
      );
    }

    const isLastMessage = chat.lastMessage?.toString() === messageId;

    await ChatMessage.findByIdAndDelete(messageId).session(session);

    if (isLastMessage) {
      const lastMessage = await ChatMessage.find({ chatId })
        .sort({ createdAt: -1 })
        .limit(1)
        .session(session);

      await Chat.findByIdAndUpdate(
        chatId,
        { lastMessage: lastMessage[0]?._id || null },
        { session },
      );
    }

    await session.commitTransaction();

    // Send events to all participants
    chat.participants.forEach((participant: ChatParticipant) => {
      if (participant.userId === currentUser.id) return;
      emitSocketEvent(
        req,
        participant.userId,
        ChatEventEnum.MESSAGE_DELETE_EVENT,
        {
          messageId,
          chatId,
          deletedBy: currentUser.id,
        },
      );
    });

    res
      .status(200)
      .json(new ApiResponse(200, messageId, "Message deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Delete message for me
export const deleteMessageForMe = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId, messageId } = req.params;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  const chat = await Chat.findById(chatId);
  if (
    !chat ||
    !chat.participants.some(
      (participant: ChatParticipant) => participant.userId === currentUser.id,
    )
  ) {
    throw new ApiError(404, "Chat does not exist");
  }

  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  if (
    message.deletedFor &&
    message.deletedFor.some(
      (user: DeletedForEntry) => user.userId === currentUser.id,
    )
  ) {
    throw new ApiError(400, "Message already deleted");
  }

  await ChatMessage.findByIdAndUpdate(messageId, {
    $push: { deletedFor: { userId: currentUser.id } },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { messageId }, "Message deleted for you"));
};

// Update reaction
export const updateReaction = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId, messageId } = req.params;
  const { emoji } = req.body;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  if (!emoji) {
    throw new ApiError(400, "Emoji is required");
  }

  const chat: ChatType | null = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (
    !chat.participants.some(
      (participant: ChatParticipant) => participant.userId === currentUser.id,
    )
  ) {
    throw new ApiError(400, "You are not part of this chat");
  }

  const message: MessageType | null = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  const userReactionIndex = message.reactions.findIndex(
    (reaction: ReactionType) => reaction.userId === currentUser.id,
  );

  let updatedMessage: MessageType | null;

  if (userReactionIndex >= 0) {
    if (message.reactions[userReactionIndex].emoji === emoji) {
      updatedMessage = await ChatMessage.findByIdAndUpdate(
        messageId,
        { $pull: { reactions: { userId: currentUser.id } } },
        { new: true },
      );
    } else {
      updatedMessage = await ChatMessage.findOneAndUpdate(
        { _id: messageId, "reactions.userId": currentUser.id },
        {
          $set: {
            "reactions.$.emoji": emoji,
            "reactions.$.timestamp": new Date(),
          },
        },
        { new: true },
      );
    }
  } else {
    updatedMessage = await ChatMessage.findByIdAndUpdate(
      messageId,
      {
        $push: {
          reactions: {
            userId: currentUser.id,
            emoji,
            timestamp: new Date(),
          },
        },
      },
      { new: true },
    );
  }
  if (!updatedMessage) {
    throw new ApiError(500, "Failed to update message");
  }

  // Notify participants
  chat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.MESSAGE_REACTION_EVENT,
      updatedMessage,
    );
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedMessage, "Reaction updated successfully"),
    );
};

// Edit message
export const editMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId, messageId } = req.params;
  const { content, replyToId } = req.body;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  if (!content.trim() && !replyToId) {
    throw new ApiError(400, "Content is required");
  }

  const chat: ChatType | null = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const message: MessageType | null = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  if (message.sender.userId !== currentUser.id) {
    throw new ApiError(403, "You cannot edit someone else's message");
  }

  const edits = message.edits || [];
  edits.push({
    content: message.content,
    editedAt: new Date(),
    editedBy: currentUser.id,
  });

  const edited: { isEdited: boolean; editedAt: Date } = {
    isEdited: true,
    editedAt: new Date(),
  };

  const updatedMessage: MessageResponseType | null =
    await ChatMessage.findByIdAndUpdate(
      messageId,
      {
        $set: {
          content,
          edited,
          edits,
        },
      },
      { new: true },
    );

  if (!updatedMessage) {
    throw new ApiError(500, "Failed to update message");
  }

  // Notify participants
  chat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.MESSAGE_EDITED_EVENT,
      updatedMessage,
    );
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedMessage, "Message edited successfully"));
};

// Mark messages as read
export const markMessagesAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId } = req.params;
  const { messageIds } = req.body;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  if (!messageIds || !messageIds.length) {
    throw new ApiError(400, "Message IDs are required");
  }

  const chat: ChatType | null = await Chat.findById(chatId);
  if (
    !chat ||
    !chat.participants.some(
      (participant: ChatParticipant) => participant.userId === currentUser.id,
    )
  ) {
    throw new ApiError(404, "Chat does not exist or you're not a participant");
  }

  const userReadStatus: ReadByType = {
    userId: currentUser.id,
    readAt: new Date(),
  };

  const result = await ChatMessage.updateMany(
    {
      _id: { $in: messageIds.map((id: string) => new Types.ObjectId(id)) },
      chatId: new Types.ObjectId(chatId),
      "readBy.userId": { $ne: currentUser.id },
    },
    {
      $push: { readBy: userReadStatus },
    },
  );

  chat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(req, participant.userId, ChatEventEnum.MESSAGE_READ_EVENT, {
      chatId,
      messageIds,
      readBy: userReadStatus,
    });
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        "Messages marked as read",
      ),
    );
};
