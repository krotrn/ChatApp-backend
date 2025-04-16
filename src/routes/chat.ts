import { Router } from "express";
import {
  addNewParticipantInGroupChat,
  createAGroupChat,
  createOrGetAOneOnOneChat,
  deleteChatForMe,
  deleteGroupChat,
  deleteOneOnOneChat,
  getAllChats,
  getChatById,
  getGroupChatDetails,
  leaveGroupChat,
  pinMessage,
  removeParticipantFromGroupChat,
  updateGroupChat,
  unpinMessage,
} from "../controllers/chat";
import { authenticate } from "../middleware/auth";
import { chatCreationRateLimiter } from "../middleware/rateLimit";

const router = Router();

router
  .route("/")
  .get(authenticate, getAllChats)
  .post(chatCreationRateLimiter, authenticate, createOrGetAOneOnOneChat);

router
  .route("/group")
  .post(chatCreationRateLimiter, authenticate, createAGroupChat)
  .get(authenticate, getGroupChatDetails);

router
  .route("/group/:chatId")
  .delete(authenticate, deleteGroupChat)
  .patch(chatCreationRateLimiter, authenticate, updateGroupChat);

router
  .route("/group/:chatId/participants")
  .post(chatCreationRateLimiter, authenticate, addNewParticipantInGroupChat);
router
  .route("/group/:chatId/participants/:userId")
  .delete(authenticate, removeParticipantFromGroupChat);

router.route("/group/:chatId/leave").delete(authenticate, leaveGroupChat);

router
  .route("/chat/:chatId")
  .get(authenticate, getChatById)
  .delete(authenticate, deleteOneOnOneChat);

router.route("/:chatId/delete-for-me").delete(authenticate, deleteChatForMe);

router
  .route("/:chatId/pin/:messageId")
  .post(authenticate, pinMessage)
  .delete(authenticate, unpinMessage);

export default router;
