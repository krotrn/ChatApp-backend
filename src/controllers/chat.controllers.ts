import { Types } from "mongoose";
import { Request, Response } from "express";
import { ChatMessage } from "../models/message.models";
import { AttachmentType } from "../types/chat.types";
import { removeLocalFile } from "../utils/FileOperations";
// import User from "../models/user.models";

const chatCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "users",
        localField: "participants",
        foreignField: "id", 
        as: "participants",
        pipeline: [
          {
            $project: {
              password: 0,
              refreshToken: 0,
              forgotPasswordToken: 0,
              forgotPasswordExpiry: 0,
              emailVerificationToken: 0,
              emailVerificationExpiry: 0,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "chatmessages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessage",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "id", 
              as: "sender",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatarUrl: 1, 
                    email: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              sender: { $first: "$sender" },
            },
          },
        ],
      },
    },
    {
      
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
  ];
};

const deleteCascadeChatMessages = async (chatId:string) => {
  try {
    const chatObjectId = new Types.ObjectId(chatId);

    const messages = await ChatMessage.find({ chat: chatObjectId });

    const attachments:AttachmentType[] = messages.reduce((acc, message) => {
      return acc.concat(message.attachments || []);
    }, []);

    attachments.forEach((attachment) => {
      if (attachment.localPath) {
        removeLocalFile(attachment.localPath);
      }
    });

    await ChatMessage.deleteMany({ chat: chatObjectId });
  } catch (error) {
    console.error("Error during cascade deletion of chat messages:", error);
    throw error;
  }
};



const createOrGetAOneOnOneChat = async (req: Request, res: Response) => {
  const { receiverId } = req.body;
  if (!receiverId) {
    throw new Error("Receiver does not exist");
  }

  return res;
};

export {chatCommonAggregation, deleteCascadeChatMessages, createOrGetAOneOnOneChat}