import { PipelineStage, startSession, Types } from "mongoose";
import { ChatMessage } from "../models/message.models";
import { removeLocalFile } from "../utils/FileOperations";
import { Request, Response } from "express";
import { Chat } from "../models/chat.models";
import ApiError from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { ChatType } from "../types/chat.type";
import { AuthenticatedRequest, CreateChatRequest } from "../types/request.type";
import { emitSocketEvent } from "../socket";
import { ChatEventEnum } from "../utils/constants";
import { AttachmentType, MessageType } from "../types/message.type";
import { validateUser } from "../utils/userHelper";
import { resilientApiCall } from "../utils/apiRetry";

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

// Dele Messages
const deleteCascadeChatMessages = async (chatId: string): Promise<void> => {
  const messages: MessageType[] = await ChatMessage.find({
    chat: new Types.ObjectId(chatId),
  });

  const attachments: AttachmentType[] = [];
  messages.forEach((message) => {
    attachments.push(...message.attachments);
  });
  await Promise.all(
    attachments.map(async (attachment) => {
      await removeLocalFile(attachment.localPath);
    })
  );

  await ChatMessage.deleteMany({
    chat: new Types.ObjectId(chatId),
  });
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

// Create or Get A One-on-One Chat
const createOrGetAOneOnOneChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { participants, name } = req.body;
  const currentUser = (req as AuthenticatedRequest).user;

  const otherParticipant = participants[0];
  if (otherParticipant.userId === currentUser.id) {
    throw new ApiError(400, "You cannot chat with yourself");
  }

  const currentUserParticipant = {
    userId: currentUser.id,
    name: currentUser.name,
    avatarUrl: currentUser.avatarUrl,
  };
  const newChatInstance = await Chat.create({
    name,
    participants: [currentUserParticipant, otherParticipant],
    admin: currentUser.id,
    createdBy: currentUser.id,
  });
  if (!(await resilientApiCall(() => validateUser(participants[0].userId)))) {
    throw new ApiError(403, "Invalid User.");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        type: "direct",
        $and: [
          {
            participants: {
              $elemMatch: { $eq: (req as AuthenticatedRequest).user.id },
            },
          },
          {
            participants: {
              $elemMatch: { $eq: participants[0] },
            },
          },
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
  const createChat = await Chat.aggregate([
    { $match: { _id: newChatInstance._id } },
    ...chatCommonAggregation(),
  ]);

  const payload: ChatType = createChat[0];
  if (!payload) {
    throw new ApiError(500, "Internal Server error");
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
    .json(new ApiResponse(201, payload, "Chat retrieved successfully"));
  return;
};

// Create A Group Chat
const createAGroupChat = async (req: Request, res: Response): Promise<void> => {
  const { name, participants } = (req as CreateChatRequest).body;
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
    ...new Set([...participants, (req as AuthenticatedRequest).user.id]),
  ];

  if (member.length < 3) {
    throw new ApiError(
      400,
      "Seems like you have passed duplicate participants."
    );
  }

  await Promise.all(
    participants.map(async (user) => {
      if (!(await resilientApiCall(() => validateUser(user.userId)))) {
        throw new ApiError(400, `User ${user.userId} not found`);
      }
    })
  );

  const groupChat: ChatType = await Chat.create({
    name,
    type: "group",
    participants: member,
    admin: (req as AuthenticatedRequest).user.id,
    createdBy: (req as AuthenticatedRequest).user.id,
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
  return;
};

// Get Chat Details
const getGroupChatDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const groupChat: ChatType[] = await Chat.aggregate([
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

// Rename Group
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
  if (groupChat.admin !== (req as AuthenticatedRequest).user.id) {
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
      new ApiResponse(200, chat[0], "Group chat name updated successfully")
    );
  return;
};

// Delete Group
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
  if (chat.admin !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "Only admin can delete the group");
  }

  const session = await startSession();
  try {
    session.startTransaction();
    await Chat.findByIdAndDelete(chatId).session(session);
    await ChatMessage.deleteMany({ chat: chatId }).session(session);
    await session.commitTransaction();
  } catch (error) {
    console.log(error);
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
  return;
};

// Leave Group Chat
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

  if (
    !existingParticipants?.some(
      (participant) => participant.userId === (req as CreateChatRequest).user.id
    )
  ) {
    throw new ApiError(400, "You are not a part of this group chat");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: (req as CreateChatRequest).user.id,
      },
    },
    { new: true }
  );
  if (!updatedChat) {
    throw new ApiError(404, "Cannot leave group.");
  }

  const chat: ChatType[] = await Chat.aggregate([
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

  payload.participants.forEach((participant) => {
    if (participant.userId === (req as AuthenticatedRequest).user.id) return;
    emitSocketEvent<ChatType>(
      req,
      participant.userId,
      ChatEventEnum.LEAVE_GROUP_EVENT,
      payload
    );
  });

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Left a group successfully"));
  return;
};

// Delete One-on-One Chat
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
      participant.userId !== (req as AuthenticatedRequest).user.id.toString()
  );

  if (!otherParticipant) {
    throw new ApiError(404, "Other user not found.");
  }
  emitSocketEvent<ChatType>(
    req,
    otherParticipant.userId,
    ChatEventEnum.DELETE_CHAT_EVENT,
    payload
  );

  res.status(200).json(new ApiResponse(200, {}, "Chat deleted successfully"));
  return;
};

// Add to Group
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

  if (groupChat.admin !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "You are not an admin");
  }

  if (!(await resilientApiCall(() => validateUser(participantId)))) {
    throw new ApiError(400, `User ${participantId} not found`);
  }

  const existingParticipants = groupChat.participants;

  if (
    existingParticipants?.some(
      (participant) => participant.userId === participantId
    )
  ) {
    throw new ApiError(409, "Participant already in a group chat");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: {
        participants: {
          userId: participantId,
          role: "member",
          joinedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!updatedChat) {
    throw new ApiError(404, "Cannot join group.");
  }

  const chat: ChatType[] = await Chat.aggregate([
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
  emitSocketEvent<ChatType>(
    req,
    participantId,
    ChatEventEnum.NEW_CHAT_EVENT,
    payload
  );

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant added successfully"));
  return;
};

// Remove From Group
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

  if (groupChat.admin !== (req as AuthenticatedRequest).user.id) {
    throw new ApiError(403, "You are not an admin");
  }

  const existingParticipants = groupChat.participants;

  if (
    !existingParticipants?.some(
      (participant) => participant.userId === participantId
    )
  ) {
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

  emitSocketEvent(req, participantId, ChatEventEnum.DELETE_CHAT_EVENT, payload);

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant removed successfully"));
  return;
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

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $addToSet: { "metadata.pinnedMessage": new Types.ObjectId(messageId) },
    },
    { new: true }
  );

  if (!updatedChat) throw new ApiError(400, "Error Pinning Message");

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
    .json(new ApiResponse(200, updatedChat, "Message unpinned successfully"));
};

// Delete Messages
const deleteChatForMe = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = (req as AuthenticatedRequest).user.id;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat.participants.some((p) => p.userId === userId)) {
    throw new ApiError(403, "You are not a participant of this chat");
  }

  if (chat.deletedFor.some((df) => df.user === userId)) {
    throw new ApiError(400, "Chat already deleted for you");
  }

  chat.deletedFor.push({ user: userId, deletedAt: new Date() });
  await chat.save();

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Chat deleted for you successfully"));
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
