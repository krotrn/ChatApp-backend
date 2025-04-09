import express from "express";
import {
  deleteMessage,
  getAllMessages,
  replyMessage,
  sendMessage,
  updateReaction,
} from "../controllers/message";
import { authenticate } from "../middleware/auth";
import {
  messageRateLimiter,
  fileUploadRateLimiter,
} from "../middleware/rateLimit";
import multer from "multer";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "public", "images"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.use(authenticate);

router
  .route("/:chatId")
  .get(messageRateLimiter, getAllMessages)
  .post(
    messageRateLimiter,
    fileUploadRateLimiter,
    upload.array("attachments", 5),
    sendMessage,
  );

router
  .route("/:chatId/:messageId")
  .delete(messageRateLimiter, deleteMessage)
  .post(messageRateLimiter, replyMessage);

router
  .route("/:chatId/:messageId/reaction")
  .post(messageRateLimiter, updateReaction);

export default router;
