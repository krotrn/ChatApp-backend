import type { Request, Response } from "express";
import { Router } from "express";

import { Chat } from "../models/chat.models";
import ApiError from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { userId, action, data } = req.body;
  try {
    if (action === "delete") {
      await Chat.updateMany(
        { "participants.userId": userId },
        { $pull: { participants: { userId } } },
      );
    } else if (action === "update") {
      const { name, avatarUrl } = data;

      await Chat.updateMany(
        { "participants.userId": userId },
        {
          $set: {
            "participants.$.name": name,
            "participants.$.avatarUrl": avatarUrl,
          },
        },
      );
    }
    res
      .status(200)
      .json(new ApiResponse(200, {}, "User data updated successfully!"));
  } catch (error) {
    const apiError = new ApiError(500, "Internal server error");
    apiError.stack = error instanceof Error ? error.stack : undefined;
    throw apiError;
  }
});

export default router;
