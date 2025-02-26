import { Router } from "express";
import { upload } from "../middleware/multer.middleware";
import {
  getAllMessages,
  sendMessage,
  deleteMessage,
  updateReaction,
  replyMessage,
} from "../controllers/message.controllers";
import authenticate from "../middleware/auth.middleware";
import { handleUploadErrors } from "../middleware/handleUploadErrors.middleware";

const router = Router();
router.use(authenticate);

/**
 * GET /api/v1/chat-app/messages/:chatId
 * POST /api/v1/chat-app/messages/:chatId
 * Retrieve or send messages within a chat.
 */
router
  .route("/:chatId")
  .get(getAllMessages)
  .post(upload.fields([{ name: "attachments", maxCount: 5 }]),handleUploadErrors, sendMessage);

/**
 * DELETE /api/v1/chat-app/messages/:chatId/:messageId
 * Remove a specific message from a chat.
 */
router.route("/:chatId/:messageId").delete(deleteMessage);

/**
 * POST /api/v1/chat-app/messages/:chatId/:messageId/reaction
 * Add or update a reaction to a message.
 */
router.post("/:chatId/:messageId/reaction", updateReaction);

/**
 * POST /api/v1/chat-app/messages/:chatId/:messageId/reply
 * Reply to a specific message in a chat.
 */
router.post("/:chatId/:messageId/reply", replyMessage);

export default router;
