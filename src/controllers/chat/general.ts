import type { Request, Response } from "express";
import { Chat } from "../../models/chat.models";
import { ApiResponse } from "../../utils/ApiResponse";
import { chatCommonAggregation } from "./aggregations";
import type { AuthenticatedRequest } from "../../types/request";
import type { ChatResponseType } from "../../types/chat";

// Get All Chats
export const getAllChats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const chats: ChatResponseType[] = await Chat.aggregate([
    {
      $match: {
        participants: {
          $elemMatch: { userId: (req as AuthenticatedRequest).user.id },
        },
        deletedFor: {
          $not: {
            $elemMatch: { userId: (req as AuthenticatedRequest).user.id },
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
      new ApiResponse(200, chats || [], "User chats fetched successfully!"),
    );
};
