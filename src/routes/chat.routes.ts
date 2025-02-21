// src/routes/chatRoutes.ts
import { Router } from "express";

// Import your controller functions and validators (assumed to be implemented)
import {
  getAllChats,
  searchAvailableUsers,
  createOrGetAOneOnOneChat,
  createAGroupChat,
  getGroupChatDetails,
  renameGroupChat,
  deleteGroupChat,
  addNewParticipantInGroupChat,
  removeParticipantFromGroupChat,
  leaveGroupChat,
  deleteOneOnOneChat,
} from "../controllers/chat.controllers";
import authenticate from "../middleware/auth.middleware";
import { AuthenticatedRequest } from "../types/request.type";

// Import any validators (if using a validation middleware)
// For example:
// import { createAGroupChatValidator, updateGroupChatNameValidator } from "../validators/chatValidators";

const router = Router();

// Apply API key verification for all chat routes
router.use((req, res, next) => {
  authenticate(req as AuthenticatedRequest, res, next);
});

/**
 * POST /api/v1/chat-app/chats/c/:receiverId
 * Create or retrieve a one-on-one chat..
 */
router.route("/chat/:receiverId").post(createOrGetAOneOnOneChat);

/**
 * POST /api/v1/chat-app/chats/group
 * Create a new group chat.
 */
router.route("/group").post(
  createAGroupChat
);

/**
 * GET /api/v1/chat-app/chats/group/:chatId
 * PATCH /api/v1/chat-app/chats/group/:chatId
 * DELETE /api/v1/chat-app/chats/group/:chatId
 * Group chat details, rename, and deletion.
 */
router
  .route("/group/:chatId")
  .get(
    // Example: mongoIdPathVariableValidator("chatId"), validate,
    getGroupChatDetails
  )
  .patch(
    // Example: mongoIdPathVariableValidator("chatId"), updateGroupChatNameValidator(), validate,
    renameGroupChat
  )
  .delete(
    // Example: mongoIdPathVariableValidator("chatId"), validate,
    deleteGroupChat
  );

/**
 * POST /api/v1/chat-app/chats/group/:chatId/:participantId
 * DELETE /api/v1/chat-app/chats/group/:chatId/:participantId
 * Add or remove a participant in a group chat.
 */
router
  .route("/group/:chatId/:participantId")
  .post(
    // Example: mongoIdPathVariableValidator("chatId"), mongoIdPathVariableValidator("participantId"), validate,
    addNewParticipantInGroupChat
  )
  .delete(
    // Example: mongoIdPathVariableValidator("chatId"), mongoIdPathVariableValidator("participantId"), validate,
    removeParticipantFromGroupChat
  );

/**
 * DELETE /api/v1/chat-app/chats/leave/group/:chatId
 * Leave a group chat.
 */
router.route("/leave/group/:chatId").delete(
  // Example: mongoIdPathVariableValidator("chatId"), validate,
  leaveGroupChat
);

/**
 * DELETE /api/v1/chat-app/chats/remove/:chatId
 * Delete a one-on-one chat.
 */
router.route("/remove/:chatId").delete(
  // Example: mongoIdPathVariableValidator("chatId"), validate,
  deleteOneOnOneChat
);

export default router;
