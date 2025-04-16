import { PipelineStage } from "mongoose";
import { chatMessageCommonAggregation } from "../message";

export const chatCommonAggregation = (): PipelineStage[] => {
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
  ];
};
