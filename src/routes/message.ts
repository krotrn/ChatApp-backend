import { Router } from "express";
import {
  deleteMessage,
  getAllMessages,
  replyMessage,
  sendMessage,
  updateReaction,
  editMessage,
  markMessagesAsRead,
  deleteMessageForMe,
} from "../controllers/message";
import { authenticate } from "../middleware/auth";
import {
  messageRateLimiter,
  fileUploadRateLimiter,
} from "../middleware/rateLimit";
import { upload } from "../middleware/multer";
import { handleUploadErrors } from "../middleware/handleUploadErrors";

const router = Router();

router
  .route("/:chatId")
  .get(messageRateLimiter, authenticate, getAllMessages)
  .post(
    messageRateLimiter,
    fileUploadRateLimiter,
    upload.array("attachments", 5),
    authenticate,
    handleUploadErrors,
    sendMessage,
  );

router
  .route("/:chatId/:messageId")
  .delete(messageRateLimiter, authenticate, deleteMessage);
router
  .route("/:chatId/:messageId/me")
  .delete(messageRateLimiter, authenticate, deleteMessageForMe);

router
  .route("/:chatId/:messageId/edit")
  .patch(messageRateLimiter, authenticate, editMessage);

router
  .route("/:chatId/read")
  .post(messageRateLimiter, authenticate, markMessagesAsRead);

router
  .route("/:chatId/reply")
  .post(messageRateLimiter, authenticate, replyMessage);

router
  .route("/:chatId/:messageId/reaction")
  .patch(messageRateLimiter, authenticate, updateReaction);

export default router;
