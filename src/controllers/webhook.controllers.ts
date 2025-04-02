import { Request, Response, Router } from "express";
import { Chat } from "../models/chat.models";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { userId, action, data } = req.body;
  try {
    if (action === "delete") {
      await Chat.updateMany(
        { "participants.userId": userId },
        { $pull: { participants: { userId } } }
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
        }
      );
    }
    res.status(200).json({ message: "User update processed" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;