import { Request, Response, Router } from "express";
import { Chat } from "../models/chat.models";
import { AuthenticatedRequest } from "../types/request.type";
const router = Router();

router.post("/user-updated", async (req: Request, res: Response) => {
  const { id, name, avatarUrl } = (req as AuthenticatedRequest).user;

  await Chat.updateMany(
    { "participants.userId": id },
    {
      $set: {
        "participants.$.name": name,
        "participants.$.avatarUrl": avatarUrl,
      },
    }
  );

  res.status(200).json({ messgae: "User updated." });
});

export default router;
