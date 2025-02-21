import { PipelineStage, Types } from "mongoose";
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

const chatCommonAggregation = (): PipelineStage[] => {
  return [
    {
      $lookup: {
        from: "chatmessage",
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


const deleteCascadeChatMessages = async (chatId: string) => {
  const messages = await ChatMessage.find({
    chat: new Types.ObjectId(chatId),
  });

  const attachments: Array<{ localPath: string }> = [];
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

const createOrGetAOneOnOneChat = async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { receiverId } = authenticatedReq.params as { receiverId: string };

  // Ensure the user is not trying to chat with themselves
  if (receiverId === authenticatedReq.user._id) {
    throw new ApiError(400, "You cannot chat with yourself");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        type: "direct",
        $and: [
          { participants: { $elemMatch: { $eq: authenticatedReq.user._id } } },
          { participants: { $elemMatch: { $eq: receiverId } } },
        ],
      },
    },
    ...chatCommonAggregation(),
  ]);

  if (chat.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, chat[0], "chat retrived successfully"));
  }

  const newChatInstance = await Chat.create({
    name: "One on one chat",
    participants: [authenticatedReq.user._id, receiverId],
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
    if (participant === authenticatedReq.user._id) return;
    emitSocketEvent(req, participant, ChatEventEnum.NEW_CHAT_EVENT, payload);
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Chat retrieved successfully"));
};

const createAGroupChat = async (req: Request, res: Response) => {
  const createRequest = req as CreateChatRequest;
  const { name, participants } = createRequest.body;
  if (participants.includes(createRequest.user._id)) {
    throw new ApiError(
      400,
      "Participants array should not contain the group creator"
    );
  }

  const member = [...new Set([...participants, createRequest.user._id])];

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
    admin: createRequest.user._id,
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
    if (participant === createRequest.user._id) return;
    emitSocketEvent(req, participant, ChatEventEnum.NEW_CHAT_EVENT, payload);
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Group chat created successfully"));
};

const getGroupChatDetails = async (req: Request, res: Response) => {
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

  return res
    .status(200)
    .json(new ApiResponse(200, chat, "Group chat fetched successfully"));
};

const renameGroupChat = async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const createReq = req as CreateChatRequest
  const { name } = req.body;
  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId),
    type: "group"
  });
  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }
  if (groupChat.admin !== createReq.user._id) {
    throw new ApiError(403, "You are not an admin");
  }
  const updatedGroupChat = await Chat.findByIdAndUpdate(chatId, {
    $set: {
      name,
    }
  },
    {new:true}
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

  const payload:ChatType = chat[0];

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

  return res
    .status(200)
    .json(
      new ApiResponse(200, chat[0], "Group chat name updated successfully")
    );
}

const deleteGroupChat = async (req:Request, res:Response) => {
  const { chatId } = req.params;

  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(chatId),
        type:"group",
      },
    },
    ...chatCommonAggregation(),
  ]);

  const chat:ChatType = groupChat[0];

  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }
  const createReq = req as CreateChatRequest;
  if (chat.admin !== createReq.user._id) {
    throw new ApiError(403, "Only admin can delete the group");
  }

  await Chat.findByIdAndDelete(chatId);

  await deleteCascadeChatMessages(chatId);


  chat?.participants?.forEach((participant) => {
    if (participant === createReq.user._id) return; 
    emitSocketEvent(
      req,
      participant,
      ChatEventEnum.LEAVE_CHAT_EVENT,
      chat
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Group chat deleted successfully"));
};

const leaveGroupChat = async (req:Request, res:Response) => {
  const { chatId } = req.params;

  const createReq = req as CreateChatRequest;
  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId),
    type:"group",
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  const existingParticipants = groupChat.participants;


  if (!existingParticipants?.includes(createReq.user?._id)) {
    throw new ApiError(400, "You are not a part of this group chat");
  }

  const updatedChat  = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: createReq.user?._id, 
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

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Left a group successfully"));
};


const addNewParticipantInGroupChat = async (req:Request, res:Response) => {
  const { chatId, participantId } = req.params;
  const createReq = req as CreateChatRequest;

  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId as string),
    type:"group",
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }


  if (groupChat.admin !== createReq.user._id) {
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

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant added successfully"));
};

const removeParticipantFromGroupChat = async (req:Request, res:Response) => {
  const { chatId, participantId } = req.params;

  const groupChat = await Chat.findOne({
    _id: new Types.ObjectId(chatId),
    type:"group",
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }
  const createReq = req as CreateChatRequest;


  if (groupChat.admin !== createReq.user._id) {
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

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant removed successfully"));
};

const getAllChats = async (req:Request, res:Response) => {
  const chats = await Chat.aggregate([
    {
      $match: {
        participants: { $elemMatch: { $eq: (req as CreateChatRequest).user._id } },
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    ...chatCommonAggregation(),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, chats || [], "User chats fetched successfully!")
    );
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
  removeParticipantFromGroupChat
};
