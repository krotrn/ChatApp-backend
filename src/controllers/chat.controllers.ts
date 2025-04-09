import type { Request, Response } from "express";
import { startSession, Types, PipelineStage } from "mongoose";

import { Chat } from "../models/chat.models";
import { ChatMessage } from "../models/message.models";
import { emitSocketEvent } from "../socket";

import ApiError from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { resilientApiCall } from "../utils/apiRetry";
import { ChatEventEnum } from "../utils/constants";
import { removeLocalFile } from "../utils/fileOperations";
import { validateUser } from "../utils/userHelper";

import { chatMessageCommonAggregation } from "./message.controllers";
import type { AuthenticatedRequest } from "../types/request.type";
import type { ChatParticipant, ChatType, DeletedForEntry } from "../types/chat.type";


const chatCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "chatmessages",
        let: { lastMessageId: "$lastMessage" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$lastMessageId"] },
            },
          },
          ...chatMessageCommonAggregation(),
        ],
        as: "lastMessage",
      },
    },
    {
      $lookup: {
        from: "chatmessages",
        let: { chatId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$chatId", "$$chatId"] },
            },
          },
          ...chatMessageCommonAggregation(),
          {
            $sort: { createdAt: -1 },
          },
        ],
        as: "messages",
      },
    },
    {
      $addFields: {
        _id: { $toString: "$_id" },
        lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
      },
    },
  ] as PipelineStage[];
};

// Get All Chats
const getAllChats = async (req: Request, res: Response): Promise<void> => {
  const chats = await Chat.aggregate([
    {
      $match: {
        participants: {
          $elemMatch: { userId: (req as AuthenticatedRequest).user.id },
        },
        deletedFor: {
          $not: {
            $elemMatch: { user: (req as AuthenticatedRequest).user.id },
          },
        },
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    ...chatCommonAggregation(),
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(200, chats || [], "User chats fetched successfully!")
    );
};

// Create or Get A One-on-One Chat
const createOrGetAOneOnOneChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const {
      participants,
      name,
    }: { participants: ChatParticipant[]; name: string } = req.body;
    const currentUser = (req as AuthenticatedRequest).user;

    const otherParticipant = participants[0];
    if (otherParticipant.userId === currentUser.id) {
      throw new ApiError(400, "You cannot chat with yourself");
    }

    // Validate other participant first
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
    const existingChat = await Chat.aggregate([
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
          new ApiResponse(200, existingChat[0], "Chat retrieved successfully")
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
      { session }
    );

    const createChat = await Chat.aggregate([
      { $match: { _id: newChatInstance[0]._id } },
      ...chatCommonAggregation(),
    ]);

    const payload: ChatType = createChat[0];
    if (!payload) {
      throw new ApiError(500, "Internal Server error");
    }

    await session.commitTransaction();

    payload.participants.forEach(async (participant) => {
      if (participant.userId === currentUser.id) return;
      await emitSocketEvent<ChatType>(
        req,
        participant.userId,
        ChatEventEnum.NEW_CHAT_EVENT,
        payload
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

// Delete Cascade Chat Messages
const deleteCascadeChatMessages = async (chatId: string): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

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
              error
            );
            // Continue with other files even if one fails
          }
        }
      }
    }

    await ChatMessage.deleteMany({ chatId }, { session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Delete One-on-One Chat
const deleteOneOnOneChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const { chatId } = req.params;
    const chat = await Chat.aggregate([
      { $match: { _id: new Types.ObjectId(chatId) } },
      ...chatCommonAggregation(),
    ]);
    const payload: ChatType = chat[0];

    if (!payload) {
      throw new ApiError(404, "Chat does not exist");
    }

    await Chat.findByIdAndDelete(chatId, { session });
    await deleteCascadeChatMessages(chatId);

    const otherParticipant = payload?.participants?.find(
      (participant) =>
        participant.userId !== (req as AuthenticatedRequest).user.id.toString()
    );
    if (!otherParticipant) {
      throw new ApiError(404, "Other user not found.");
    }

    await session.commitTransaction();

    await emitSocketEvent<ChatType>(
      req,
      otherParticipant.userId,
      ChatEventEnum.DELETE_CHAT_EVENT,
      payload
    );

    res.status(200).json(new ApiResponse(200, {}, "Chat deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Get Chat By Id
const getChatById = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  if (!chatId) {
    throw new ApiError(404, "Chat ID is required");
  }

  const chats = await Chat.aggregate([
    { $match: { _id: new Types.ObjectId(chatId) } },
    ...chatCommonAggregation(),
  ]);
  if (!chats || chats.length === 0) {
    throw new ApiError(404, "Chat not found");
  }
  const chat = chats[0];
  res.status(200).json(new ApiResponse(200, chat, "Chat fetched successfully"));
};

// Delete Chat For Me
const deleteChatForMe = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = (req as AuthenticatedRequest).user.id;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat.participants.some((p: ChatParticipant) => p.userId === userId)) {
    throw new ApiError(403, "You are not a participant of this chat");
  }

  if (chat.deletedFor.some((df: DeletedForEntry) => df.userId === userId)) {
    throw new ApiError(400, "Chat already deleted for you");
  }

  chat.deletedFor.push({ user: userId, deletedAt: new Date() });
  await chat.save();

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Chat deleted for you successfully"));
};

// Create A Group Chat
const createAGroupChat = async (req: Request, res: Response): Promise<void> => {
  const {
    name,
    participants,
  }: { participants: ChatParticipant[]; name: string } = req.body;
  if (
    participants.some(
      (participant) =>
        participant.userId === (req as AuthenticatedRequest).user.id
    )
  ) {
    throw new ApiError(
      400,
      "Participants array should not contain the group creator"
    );
  }

  const member = [
    ...new Set([
      ...participants.map((p) => p.userId),
      (req as AuthenticatedRequest).user.id,
    ]),
  ];

  if (member.length < 3) {
    throw new ApiError(
      400,
      "Seems like you have passed duplicate participants."
    );
  }

  await Promise.all(
    participants.map(async (user) => {
      if (!(await resilientApiCall(() => validateUser([user.userId])))) {
        throw new ApiError(400, `User ${user.userId} not found`);
      }
    })
  );

  const groupChat: ChatType = await Chat.create({
    name,
    type: "group",
    participants: member.map((userId) => ({ userId, joinedAt: new Date() })),
    admin: (req as AuthenticatedRequest).user.id,
    createdBy: (req as AuthenticatedRequest).user.id,
  });

  const chat = await Chat.aggregate([
    { $match: { _id: groupChat._id } },
    ...chatCommonAggregation(),
  ]);
  const payload: ChatType = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  payload.participants.forEach(async (participant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent<ChatType>(
      req,
      participant.userId,
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  res
    .status(201)
    .json(new ApiResponse(201, payload, "Group chat created successfully"));
};

// Get Group Chat Details
const getGroupChatDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const groupChat: ChatType[] = await Chat.aggregate([
    { $match: { _id: new Types.ObjectId(chatId), type: "group" } },
    ...chatCommonAggregation(),
  ]);
  const chat = groupChat[0];
  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }
  res
    .status(200)
    .json(new ApiResponse(200, chat, "Group chat fetched successfully"));
};

// Rename Group Chat
const renameGroupChat = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const { name }: { name: string } = req.body;
  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId),
    type: "group",
  });
  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }
  if (groupChat.admin !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "You are not an admin");
  }
  const updatedGroupChat = await Chat.findByIdAndUpdate(
    chatId,
    { $set: { name } },
    { new: true }
  );
  if (!updatedGroupChat) {
    throw new ApiError(404, "Cannot update name of group chat.");
  }
  const chat = await Chat.aggregate([
    { $match: { _id: updatedGroupChat._id } },
    ...chatCommonAggregation(),
  ]);
  const payload: ChatType = chat[0];
  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }
  payload.participants.forEach((participant) => {
    emitSocketEvent<ChatType>(
      req,
      participant.userId,
      ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
      payload
    );
  });
  res
    .status(200)
    .json(
      new ApiResponse(200, payload, "Group chat name updated successfully")
    );
};

// Delete Group Chat
const deleteGroupChat = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const groupChat = await Chat.aggregate([
    { $match: { _id: new Types.ObjectId(chatId), type: "group" } },
    ...chatCommonAggregation(),
  ]);
  const chat: ChatType = groupChat[0];
  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }
  if (chat.admin !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "Only admin can delete the group");
  }

  const session = await startSession();
  try {
    session.startTransaction();
    await Chat.findByIdAndDelete(chatId).session(session);
    await ChatMessage.deleteMany({ chat: new Types.ObjectId(chatId) }).session(
      session
    );
    await session.commitTransaction();
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
      throw new ApiError(500, error.message);
    }
    await session.abortTransaction();
    throw new ApiError(500, "Failed to delete chat");
  } finally {
    session.endSession();
  }

  chat.participants.forEach((participant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent<ChatType>(
      req,
      participant.userId,
      ChatEventEnum.DELETE_CHAT_EVENT,
      chat
    );
  });
  res
    .status(200)
    .json(new ApiResponse(200, [], "Group chat deleted successfully"));
};

// Add New Participant In Group Chat
const addNewParticipantInGroupChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const { participants } = req.body as { participants: string[] };

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (chat.type !== "group") {
    throw new ApiError(400, "This feature is only available for group chats");
  }

  if (
    chat.admin?.toString() !== (req as AuthenticatedRequest).user.id.toString()
  ) {
    throw new ApiError(403, "You are not an admin");
  }

  const existingParticipants = chat.participants.map(
    (participant: ChatParticipant) => participant.userId.toString()
  );

  const newParticipants = participants.filter(
    (participantId) => !existingParticipants.includes(participantId)
  );

  if (!newParticipants.length) {
    throw new ApiError(400, "No new participants to add");
  }

  const usersToAdd = await validateUser(newParticipants);

  const newParticipantObjects = usersToAdd.map((user) => ({
    userId: user._id,
    name: user.fullName,
    avatarUrl: user.avatar,
    role: "member",
    joinedAt: new Date(),
  }));

  chat.participants.push(...newParticipantObjects);
  await chat.save();

  const chatWithParticipants = await Chat.findById(chatId).populate(
    "participants.userId",
    "fullName avatar"
  );

  emitSocketEvent(
    req,
    chatId,
    ChatEventEnum.NEW_PARTICIPANT_ADDED_EVENT,
    chatWithParticipants
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        chatWithParticipants,
        "New participants added successfully"
      )
    );
};

// Remove Participant From Group Chat
const removeParticipantFromGroupChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId, participantId } = req.params;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (chat.type !== "group") {
    throw new ApiError(400, "This feature is only available for group chats");
  }

  if (chat.admin?.toString() !== (req as AuthenticatedRequest).user.id.toString()) {
    throw new ApiError(403, "You are not an admin");
  }

  const participantExists = chat.participants.find(
    (participant: ChatParticipant) =>
      participant.userId.toString() === participantId
  );

  if (!participantExists) {
    throw new ApiError(404, "Participant does not exist in the group chat");
  }

  chat.participants = chat.participants.filter(
    (participant: ChatParticipant) =>
      participant.userId.toString() !== participantId
  );

  await chat.save();

  const chatWithParticipants = await Chat.findById(chatId).populate(
    "participants.userId",
    "fullName avatar"
  );

  emitSocketEvent(
    req,
    chatId,
    ChatEventEnum.PARTICIPANT_LEFT_EVENT,
    chatWithParticipants
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        chatWithParticipants,
        "Participant removed successfully"
      )
    );
};

// Leave Group Chat
const leaveGroupChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (chat.type !== "group") {
    throw new ApiError(400, "This feature is only available for group chats");
  }

  const participantExists = chat.participants.find(
    (participant: ChatParticipant) =>
      participant.userId.toString() === (req as AuthenticatedRequest).user.id.toString()
  );

  if (!participantExists) {
    throw new ApiError(404, "You are not a participant of the group chat");
  }

  chat.participants = chat.participants.filter(
    (participant: ChatParticipant) =>
      participant.userId.toString() !== (req as AuthenticatedRequest).user.id.toString()
  );

  await chat.save();

  const chatWithParticipants = await Chat.findById(chatId).populate(
    "participants.userId",
    "fullName avatar"
  );

  emitSocketEvent(
    req,
    chatId,
    ChatEventEnum.PARTICIPANT_LEFT_EVENT,
    chatWithParticipants
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, chatWithParticipants, "Left group successfully")
    );
};

// Pin Messages
const pinMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }
  if (chat.admin !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "Only admin can pin messages");
  }
  const updatedChat: ChatType | null = await Chat.findByIdAndUpdate(
    chatId,
    {
      $addToSet: { "metadata.pinnedMessage": new Types.ObjectId(messageId) },
    },
    { new: true }
  );
  if (!updatedChat) throw new ApiError(400, "Error pinning message");

  updatedChat.participants.forEach((participant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.MESSAGE_PIN_EVENT,
      updatedChat
    );
  });
  res
    .status(200)
    .json(new ApiResponse(200, updatedChat, "Message pinned successfully"));
};

// Unpin Messages
const unpinMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId, messageId } = req.params;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }
  if (chat.admin !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "Only admin can unpin messages");
  }
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { "metadata.pinnedMessage": new Types.ObjectId(messageId) },
    },
    { new: true }
  );
  if (!updatedChat) {
    throw new ApiError(400, "No pinned message found");
  }
  updatedChat.participants.forEach((participant: ChatParticipant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent(
      req,
      participant.userId,
      ChatEventEnum.MESSAGE_PIN_EVENT,
      updatedChat
    );
  });
  res
    .status(200)
    .json(new ApiResponse(200, updatedChat, "Message unpinned successfully"));
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
  deleteChatForMe,
  getChatById,
};
