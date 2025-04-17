import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Chat } from "../../models/chat.models";
import { ChatMessage } from "../../models/message.models";
import { emitSocketEvent } from "../../socket";
import ApiError from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { ChatEventEnum } from "../../utils/constants";
import type { AuthenticatedRequest } from "../../types/request";
import type { ChatParticipant, ChatType } from "../../types/chat";
import { MessageType } from "src/types/message";
// Pin Message
export const pinMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId, messageId } = req.params;
  const currentUser = (req as AuthenticatedRequest).user;

  const chat: ChatType | null = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (
    !chat.participants.some(
      (participant: ChatParticipant) => participant.userId === currentUser.id
    )
  ) {
    throw new ApiError(400, "You are not a participant of this chat");
  }

  const message: MessageType | null = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.chatId.toString() !== chatId) {
    throw new ApiError(400, "Message does not belong to this chat");
  }

  // Check if already pinned
  if (
    chat.metadata.pinnedMessage.some(
      (pin: Types.ObjectId) => pin.toString() === messageId
    )
  ) {
    throw new ApiError(400, "Message is already pinned");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $addToSet: {
        "metadata.pinnedMessage": new Types.ObjectId(messageId),
      },
    },
    { new: true }
  );

  if (!updatedChat) {
    throw new ApiError(500, "Internal server error");
  }

  chat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(req, participant.userId, ChatEventEnum.MESSAGE_PIN_EVENT, {
      chatId,
      messageId,
      isPinned: true,
    });
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, { chatId, messageId }, "Message pinned successfully")
    );
};

// Unpin Message
export const unpinMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId, messageId } = req.params;
  const currentUser = (req as AuthenticatedRequest).user;

  const chat: ChatType | null = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (
    !chat.participants.some(
      (participant: ChatParticipant) => participant.userId === currentUser.id
    )
  ) {
    throw new ApiError(400, "You are not a participant of this chat");
  }

  // Check if message is pinned
  if (
    !chat.metadata.pinnedMessage.some(
      (pin: Types.ObjectId) => pin.toString() === messageId
    )
  ) {
    throw new ApiError(400, "Message is not pinned");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        "metadata.pinnedMessage": new Types.ObjectId(messageId),
      },
    },
    { new: true }
  );

  if (!updatedChat) {
    throw new ApiError(500, "Internal server error");
  }

  chat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(req, participant.userId, ChatEventEnum.MESSAGE_PIN_EVENT, {
      chatId,
      messageId,
      isPinned: false,
    });
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { chatId, messageId },
        "Message unpinned successfully"
      )
    );
};
