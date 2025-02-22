import { Router } from "express";
import {
  getAllChats,
  createOrGetAOneOnOneChat,
  createAGroupChat,
  getGroupChatDetails,
  renameGroupChat,
  deleteGroupChat,
  addNewParticipantInGroupChat,
  removeParticipantFromGroupChat,
  leaveGroupChat,
  deleteOneOnOneChat,
  pinMessage,
  unpinMessage,
} from "../controllers/chat.controllers";
import authenticate from "../middleware/auth.middleware";
import "../types/express";

/**
 * Sets up chat-related routes for the Express application.
 *
 * The following routes are defined:
 *
 * - GET /: Retrieves all chats for the authenticated user.
 * - POST /chat/:receiverId: Creates or retrieves a one-on-one chat with the specified receiver.
 * - POST /group: Creates a new group chat.
 * - GET /group/:chatId: Retrieves details of a specific group chat.
 * - PATCH /group/:chatId: Renames a specific group chat.
 * - DELETE /group/:chatId: Deletes a specific group chat.
 * - POST /group/:chatId/:participantId: Adds a new participant to a specific group chat.
 * - DELETE /group/:chatId/:participantId: Removes a participant from a specific group chat.
 * - DELETE /leave/group/:chatId: Allows a user to leave a specific group chat.
 * - DELETE /remove/:chatId: Deletes a one-on-one chat.
 *
 * All routes are protected by the `authenticate` middleware, which ensures that only authenticated users can access them.
 *
 * @module routes/chat
 */
const router = Router();

// Apply API key verification for all chat routes
router.use(authenticate);

router.route("/").get(getAllChats);

/**
 * POST /api/v1/chat-app/chats/c/:receiverId
 * Create or retrieve a one-on-one chat..
 */
router.route("/chat/:receiverId").post(createOrGetAOneOnOneChat);

/**
 * POST /api/v1/chat-app/chats/group
 * Create a new group chat.
 */
router.route("/group").post(createAGroupChat);

/**
 * GET /api/v1/chat-app/chats/group/:chatId
 * PATCH /api/v1/chat-app/chats/group/:chatId
 * DELETE /api/v1/chat-app/chats/group/:chatId
 * Group chat details, rename, and deletion.
 */
router
  .route("/group/:chatId")
  .get(getGroupChatDetails)
  .patch(renameGroupChat)
  .delete(deleteGroupChat);

/**
 * POST /api/v1/chat-app/chats/group/:chatId/:participantId
 * DELETE /api/v1/chat-app/chats/group/:chatId/:participantId
 * Add or remove a participant in a group chat.
 */
router
  .route("/group/:chatId/:participantId")
  .post(addNewParticipantInGroupChat)
  .delete(removeParticipantFromGroupChat);

/**
 * DELETE /api/v1/chat-app/chats/leave/group/:chatId
 * Leave a group chat.
 */
router.route("/leave/group/:chatId").delete(leaveGroupChat);

/**
 * DELETE /api/v1/chat-app/chats/remove/:chatId
 * Delete a one-on-one chat.
 */
router.route("/remove/:chatId").delete(deleteOneOnOneChat);

router.post("/chats/:chatId/pin/:messageId", pinMessage);
router.delete("/chats/:chatId/pin/:messageId", unpinMessage);

export default router;
