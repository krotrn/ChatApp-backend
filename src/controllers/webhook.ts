import type { Request, Response } from "express";
import { Router } from "express";

import { Chat } from "../models/chat.models";
import ApiError from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { action, name, avatarUrl } = req.body;
  const user = req.user;
  if (!user) {
    throw new ApiError(403, "Forbidden: Invalid user");
  }
  try {
    if (action === "delete") {
      await Chat.updateMany(
        { "participants.userId": user.id },
        { $pull: { participants: { userId: user.id } } },
      );
    } else if (action === "update") {
      await Chat.updateMany(
        { "participants.userId": user.id },
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
      .json(new ApiResponse(200, null, "User data updated successfully!"));
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Internal server error");
  }
});

export const deleteUserWebhook = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(403, "Forbidden: Invalid user");
  }
  try {
    await Chat.updateMany(
      { "participants.userId": user.id },
      { $pull: { participants: { userId: user.id } } },
    );
    res
      .status(200)
      .json(new ApiResponse(200, null, "User deleted successfully!"));
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Internal server error");
  }
};

export const updateUserWebhook = async (req: Request, res: Response) => {
  const { name, avatarUrl } = req.body;
  const user = req.user;
  if (!user) {
    throw new ApiError(403, "Forbidden: Invalid user");
  }
  try {
    await Chat.updateMany(
      { "participants.userId": user.id },
      {
        $set: {
          "participants.$.name": name,
          "participants.$.avatarUrl": avatarUrl,
        },
      },
    );

    res
      .status(200)
      .json(new ApiResponse(200, null, "User data updated successfully!"));
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Internal server error");
  }
};

export default router;
