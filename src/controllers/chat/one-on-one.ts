import type { Request, Response } from "express";
import { startSession, Types, ClientSession } from "mongoose";
import { Chat } from "../../models/chat.models";
import { ChatMessage } from "../../models/message.models";
import { emitSocketEvent } from "../../socket";
import ApiError from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { ChatEventEnum } from "../../utils/constants";
import { removeLocalFile } from "../../utils/fileOperations";
import { validateUser } from "../../utils/userHelper";
import { chatCommonAggregation } from "./aggregations";
import type {
  ChatParticipant,
  DeletedForEntry,
  ChatResponseType,
  ChatType,
} from "../../types/chat";

// Delete Cascade Chat Messages - Helper function
export const deleteCascadeChatMessages = async (
  chatId: string,
  session: ClientSession,
): Promise<void> => {
  try {
    const messages = await ChatMessage.find({ chatId });

    for (const message of messages) {
      if (message.attachments?.length) {
        for (const attachment of message.attachments) {
          try {
            await removeLocalFile(attachment.localPath);
          } catch (error) {
            console.error(
              `Failed to delete file: ${attachment.localPath}`,
              error,
            );
          }
        }
      }
    }

    await ChatMessage.deleteMany({ chatId }, { session });
  } catch (error) {
    throw error;
  }
};

// Create or Get A One-on-One Chat
export const createOrGetAOneOnOneChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const {
      participants,
      name,
    }: { participants: ChatParticipant[]; name: string } = req.body;
    const currentUser = req.user;
    if (!currentUser) {
      res.status(400).json(new ApiError(400, "User not Found"));
      return;
    }

    const otherParticipant = participants[0];
    if (otherParticipant.userId === currentUser.id) {
      throw new ApiError(400, "You cannot chat with yourself");
    }

    const usersToAdd = await validateUser([otherParticipant.userId]);
    if (!usersToAdd.length) {
      throw new ApiError(403, "Invalid User.");
    }

    const currentUserParticipant = {
      userId: currentUser.id,
      name: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
    };

    // Check for existing chat
    const existingChat: ChatResponseType[] = await Chat.aggregate([
      {
        $match: {
          type: "direct",
          participants: {
            $all: [
              { $elemMatch: { userId: currentUser.id } },
              { $elemMatch: { userId: otherParticipant.userId } },
            ],
          },
        },
      },
      ...chatCommonAggregation(),
    ]);

    if (existingChat.length) {
      await session.commitTransaction();
      res
        .status(200)
        .json(
          new ApiResponse(200, existingChat[0], "Chat retrieved successfully"),
        );
      return;
    }

    // Create new chat
    const newChatInstance = await Chat.create(
      [
        {
          name,
          type: "direct",
          participants: [currentUserParticipant, otherParticipant],
          admin: currentUser.id,
          createdBy: currentUser.id,
        },
      ],
      { session },
    );

    const createChat: ChatResponseType[] = await Chat.aggregate([
      { $match: { _id: newChatInstance[0]._id } },
      ...chatCommonAggregation(),
    ]).session(session);

    const payload = createChat[0];
    if (!payload) {
      throw new ApiError(500, "Internal Server error");
    }

    await session.commitTransaction();

    payload.participants.forEach((participant: ChatParticipant) => {
      if (participant.userId === currentUser.id) return;
      emitSocketEvent(
        req,
        participant.userId,
        ChatEventEnum.NEW_CHAT_EVENT,
        payload,
      );
    });

    res
      .status(201)
      .json(new ApiResponse(201, payload, "Chat created successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Delete One-on-One Chat
export const deleteOneOnOneChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await startSession();
  session.startTransaction();
  const currentUser = req.user;

  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  try {
    const { chatId } = req.params;
    const chat: ChatResponseType[] = await Chat.aggregate([
      { $match: { _id: new Types.ObjectId(chatId) } },
      ...chatCommonAggregation(),
    ]).session(session);
    const payload = chat[0];

    if (!payload) {
      throw new ApiError(404, "Chat does not exist");
    }

    if (payload.type !== "direct") {
      throw new ApiError(400, "This action is only for direct chats");
    }

    await deleteCascadeChatMessages(chatId, session);
    await Chat.findByIdAndDelete(chatId).session(session);

    await session.commitTransaction();

    payload.participants.forEach((participant: ChatParticipant) => {
      if (participant.userId === currentUser.id) return;
      emitSocketEvent(
        req,
        participant.userId,
        ChatEventEnum.CHAT_DELETED_EVENT,
        payload,
      );
    });

    res
      .status(200)
      .json(new ApiResponse(200, null, "Chat deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Get Chat By Id
export const getChatById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const chat: ChatResponseType[] = await Chat.aggregate([
    { $match: { _id: new Types.ObjectId(req.params.chatId) } },
    ...chatCommonAggregation(),
  ]);

  if (!chat.length) {
    throw new ApiError(404, "Chat does not exist.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, chat[0], "Chat fetched successfully"));
};

// Delete Chat For Me
export const deleteChatForMe = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId } = req.params;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
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

  // Check if already deleted
  if (
    chat.deletedFor.some(
      (deletedFor: DeletedForEntry) => deletedFor.userId === currentUser.id,
    )
  ) {
    throw new ApiError(400, "Chat already deleted");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: {
        deletedFor: {
          userId: currentUser.id,
          deletedAt: new Date(),
        },
      },
    },
    { new: true },
  );

  if (!updatedChat) {
    throw new ApiError(500, "Internal server error");
  }

  if (updatedChat.deletedFor.length === chat.participants.length) {
    console.log("Deleting chat as all participants have deleted it");
    // Deleting chat as all participants have deleted it
    try {
      const session = await startSession();
      session.startTransaction();

      await deleteCascadeChatMessages(chatId, session);
      await Chat.findByIdAndDelete(chatId).session(session);

      await session.commitTransaction();
      session.endSession();

      // Notify all participants
      chat.participants.forEach((participant: ChatParticipant) => {
        emitSocketEvent(
          req,
          participant.userId,
          ChatEventEnum.CHAT_DELETED_EVENT,
          { _id: chatId },
        );
      });

      console.log("Chat deleted successfully after all participants have left");
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiResponse(500, null, "Error deleting chat"));
      return;
    }
  }

  res.status(200).json(new ApiResponse(200, null, "Chat deleted successfully"));
};
