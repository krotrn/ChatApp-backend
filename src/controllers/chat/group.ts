import type { Request, Response } from "express";
import { startSession, Types } from "mongoose";
import { Chat } from "../../models/chat.models";
import { emitSocketEvent } from "../../socket";
import ApiError from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { ChatEventEnum } from "../../utils/constants";
import { validateUser } from "../../utils/userHelper";
import { chatCommonAggregation } from "./aggregations";
import type {
  ChatParticipant,
  ChatResponseType,
  ChatType,
} from "../../types/chat";
import { deleteCascadeChatMessages } from "./one-on-one";

// Create A Group Chat
export const createAGroupChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const { name, participants } = req.body;
    const currentUser = req.user;
    if (!currentUser) {
      res.status(400).json(new ApiError(400, "User not Found"));
      return;
    }

    if (!name?.trim()) {
      throw new ApiError(400, "Group name is required");
    }

    if (!participants || !participants.length) {
      throw new ApiError(400, "Participants are required to create a group");
    }

    if (
      participants.find((p: ChatParticipant) => p.userId === currentUser.id)
    ) {
      throw new ApiError(400, "You are already added in participants");
    }

    const userIds = participants.map((p: ChatParticipant) => p.userId);
    const participantsToAdd = await validateUser(userIds);

    if (participantsToAdd.length !== userIds.length) {
      throw new ApiError(400, "Some participants are invalid");
    }

    const currentUserParticipant = {
      userId: currentUser.id,
      name: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
    };

    const allGroupParticipants = [currentUserParticipant, ...participants];

    const chatGroup = await Chat.create(
      [
        {
          name,
          type: "group",
          participants: allGroupParticipants,
          admin: currentUser.id,
          createdBy: currentUser.id,
        },
      ],
      { session },
    );

    const groupChat: ChatResponseType[] = await Chat.aggregate([
      { $match: { _id: chatGroup[0]._id } },
      ...chatCommonAggregation(),
    ]).session(session);

    const payload = groupChat[0];
    if (!payload) {
      throw new ApiError(500, "Internal server error");
    }

    await session.commitTransaction();

    // Notify all participants
    payload.participants.forEach((participant) => {
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
      .json(new ApiResponse(201, payload, "Group chat created successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Get Group Chat Details
export const getGroupChatDetails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const chat: ChatResponseType[] = await Chat.aggregate([
    { $match: { _id: new Types.ObjectId(req.params.chatId) } },
    ...chatCommonAggregation(),
  ]);

  if (!chat.length) {
    throw new ApiError(404, "Chat not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, chat[0], "Group details fetched successfully"));
};

// Update Group Chat
export const updateGroupChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId } = req.params;
  const { name, avatarUrl } = req.body;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  if (!name?.trim()) {
    throw new ApiError(400, "Name is required");
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (chat.type !== "group") {
    throw new ApiError(400, "This is not a group chat");
  }

  if (chat.admin !== currentUser.id) {
    throw new ApiError(403, "Only admin can update group details");
  }

  const updateData: { name: string; avatarUrl: string } = {
    name,
    avatarUrl,
  };

  const updatedChat: ChatResponseType | null = await Chat.findByIdAndUpdate(
    chatId,
    { $set: updateData },
    { new: true },
  );

  if (!updatedChat) {
    throw new ApiError(500, "Internal server error");
  }

  // Notify all participants
  chat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.CHAT_UPDATED_EVENT,
      updatedChat,
    );
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedChat, "Group updated successfully"));
};

// Delete Group Chat
export const deleteGroupChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId } = req.params;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (chat.type !== "group") {
    throw new ApiError(400, "This is not a group chat");
  }

  if (chat.admin !== currentUser.id) {
    throw new ApiError(403, "Only admin can delete the group");
  }

  const deletedChat = await Chat.findByIdAndDelete(chatId);
  if (!deletedChat) {
    throw new ApiError(500, "Internal server error");
  }

  // Notify all participants
  chat.participants.forEach((participant: ChatParticipant) => {
    if (participant.userId === currentUser.id) return;
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.CHAT_DELETED_EVENT,
      chat,
    );
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Group deleted successfully"));
};

// Add New Participant In Group Chat
export const addNewParticipantInGroupChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId } = req.params;
  const { participants } = req.body;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  if (!participants || !participants.length) {
    throw new ApiError(400, "Participants are required");
  }

  const chat: ChatType | null = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (chat.type !== "group") {
    throw new ApiError(400, "This is not a group chat");
  }

  if (chat.admin !== currentUser.id) {
    throw new ApiError(403, "Only admin can add participants");
  }

  const userIds = participants.map((p: ChatParticipant) => p.userId);

  // Filter existing participants
  const existingParticipantIds = chat.participants.map(
    (p: ChatParticipant) => p.userId,
  );
  const newUserIds = userIds.filter(
    (id: string) => !existingParticipantIds.includes(id),
  );

  if (!newUserIds.length) {
    throw new ApiError(400, "All users are already in the group");
  }

  const newParticipants = await validateUser(newUserIds);
  if (newParticipants.length !== newUserIds.length) {
    throw new ApiError(400, "Some participants are invalid");
  }

  const newUserParticipants = participants.filter((p: ChatParticipant) =>
    newUserIds.includes(p.userId),
  );

  const updatedChat: ChatType | null = await Chat.findByIdAndUpdate(
    chatId,
    { $push: { participants: { $each: newUserParticipants } } },
    { new: true },
  );

  if (!updatedChat) {
    throw new ApiError(500, "Internal server error");
  }

  const chatResponse: ChatResponseType[] = await Chat.aggregate([
    { $match: { _id: updatedChat._id } },
    ...chatCommonAggregation(),
  ]);

  const payload = chatResponse[0];

  // Notify existing members
  chat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.CHAT_UPDATED_EVENT,
      payload,
    );
  });

  // Notify new members
  newUserIds.forEach((userId: string) => {
    emitSocketEvent(req, userId, ChatEventEnum.NEW_CHAT_EVENT, payload);
  });

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Participants added successfully"));
};

// Remove Participant From Group Chat
export const removeParticipantFromGroupChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId, userId } = req.params;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  if (userId === currentUser.id) {
    throw new ApiError(400, "You cannot remove yourself from the group");
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (chat.type !== "group") {
    throw new ApiError(400, "This is not a group chat");
  }

  if (chat.admin !== currentUser.id) {
    throw new ApiError(403, "Only admin can remove participants");
  }

  if (!chat.participants.some((p: ChatParticipant) => p.userId === userId)) {
    throw new ApiError(400, "User is not a participant of the chat");
  }

  const updatedChat: ChatType | null = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { participants: { userId } } },
    { new: true },
  );

  if (!updatedChat) {
    throw new ApiError(500, "Internal server error");
  }

  const chatResponse: ChatResponseType[] = await Chat.aggregate([
    { $match: { _id: updatedChat._id } },
    ...chatCommonAggregation(),
  ]);

  const payload = chatResponse[0];

  // Notify existing members
  updatedChat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.CHAT_UPDATED_EVENT,
      payload,
    );
  });

  // Notify removed member
  emitSocketEvent(req, userId, ChatEventEnum.REMOVED_FROM_CHAT, payload);

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant removed successfully"));
};

// Leave Group Chat
export const leaveGroupChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { chatId } = req.params;
  const currentUser = req.user;
  if (!currentUser) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (chat.type !== "group") {
    throw new ApiError(400, "This is not a group chat");
  }

  if (
    !chat.participants.some((p: ChatParticipant) => p.userId === currentUser.id)
  ) {
    throw new ApiError(400, "You are not a participant of this chat");
  }

  let updatedChat;

  if (chat.admin === currentUser.id) {
    // If admin is leaving, assign new admin
    const nonAdminParticipants = chat.participants.filter(
      (p: ChatParticipant) => p.userId !== currentUser.id,
    );

    if (nonAdminParticipants.length === 0) {
      console.log("Deleting chat as all participants have left");
      // Deleting chat as all participants have left
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

        console.log(
          "Chat deleted successfully after all participants have left",
        );
      } catch (error) {
        console.log(error);
        res.status(500).json(new ApiResponse(500, null, "Error deleting chat"));
        return;
      }
    }

    // Assign the first non-admin participant as the new admin
    const newAdmin = nonAdminParticipants[0];

    updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: { participants: { userId: currentUser.id } },
        $set: { admin: newAdmin.userId },
      },
      { new: true },
    );
  } else {
    // Non-admin leaving
    updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { participants: { userId: currentUser.id } } },
      { new: true },
    );
  }

  if (!updatedChat) {
    throw new ApiError(500, "Internal server error");
  }

  const chatResponse: ChatResponseType[] = await Chat.aggregate([
    { $match: { _id: updatedChat._id } },
    ...chatCommonAggregation(),
  ]);

  const chatPayload = chatResponse[0];

  // Notify remaining members
  updatedChat.participants.forEach((participant: ChatParticipant) => {
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.CHAT_UPDATED_EVENT,
      chatPayload,
    );
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "You left the group successfully"));
};
