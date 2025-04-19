import type { Request, Response } from "express";
import { Chat } from "../../models/chat.models";
import { ApiResponse } from "../../utils/ApiResponse";
import { chatCommonAggregation } from "./aggregations";
import type { ChatResponseType } from "../../types/chat";
import ApiError from "../../utils/ApiError";

// Get All Chats
export const getAllChats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { limit = "10", page = "1" } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  if (
    isNaN(pageNumber) ||
    isNaN(limitNumber) ||
    pageNumber < 1 ||
    limitNumber < 1 ||
    limitNumber > 100
  ) {
    throw new ApiError(400, "Invalid page or limit number");
  }
  if (!req.user) {
    res.status(400).json(new ApiError(400, "User not Found"));
    return;
  }
  const filter = {
    participants: {
      $elemMatch: { userId: req.user.id },
    },
    deletedFor: {
      $not: {
        $elemMatch: { userId: req.user.id },
      },
    },
  };

  const skip = (pageNumber - 1) * limitNumber;

  const chats: ChatResponseType[] = await Chat.aggregate([
    {
      $match: filter,
    },
    ...chatCommonAggregation(),
    {
      $sort: { updatedAt: -1 },
    },
    { $skip: skip },
    { $limit: limitNumber },
  ]);
  const total = await Chat.countDocuments(filter);
  res.status(200).json(
    new ApiResponse(
      200,
      {
        chats,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          hasMore: total > pageNumber * limitNumber,
        },
      },
      "User chats fetched successfully!",
    ),
  );
};
