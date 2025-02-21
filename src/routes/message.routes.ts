// src/routes/messageRoutes.ts
import { Router } from "express";
import verifyApiKey from "../middleware/auth.middleware";
import { upload } from "../middleware/multer.middleware";

// Import your message controllers
import {
  getAllMessages,
  sendMessage,
  deleteMessage,
} from "../controllers/message.controllers";

// Create a router instance and apply API key verification
const router = Router();
// Apply API key verification for all chat routes
router.use((req, res, next) => {
  verifyApiKey(req, res, next);
});

/**
 * GET /api/v1/chat-app/messages/:chatId
 * Retrieve all messages for a given chat.
 */
router.route("/:chatId").get(getAllMessages);

/**
 * POST /api/v1/chat-app/messages/:chatId
 * Send a new message with optional file attachments.
 */
router
  .route("/:chatId")
  .post(upload.fields([{ name: "attachments", maxCount: 5 }]), sendMessage);

/**
 * DELETE /api/v1/chat-app/messages/:chatId/:messageId
 * Delete a specific message in a chat.
 */
router.route("/:chatId/:messageId").delete(deleteMessage);

export default router;
