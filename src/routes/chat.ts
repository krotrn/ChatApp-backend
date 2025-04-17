import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { chatCreationRateLimiter } from "../middleware/rateLimit";
import { getAllChats } from "../controllers/chat/general";
import {
  createOrGetAOneOnOneChat,
  deleteChatForMe,
  deleteOneOnOneChat,
  getChatById,
} from "../controllers/chat/one-on-one";
import {
  addNewParticipantInGroupChat,
  createAGroupChat,
  deleteGroupChat,
  getGroupChatDetails,
  leaveGroupChat,
  removeParticipantFromGroupChat,
  updateGroupChat,
} from "../controllers/chat/group";
import { pinMessage, unpinMessage } from "../controllers/chat/pin";

const router = Router();

router
  .route("/")
  .get(authenticate, getAllChats)
  .post(chatCreationRateLimiter, authenticate, createOrGetAOneOnOneChat);
router
  .route("/chat/:chatId")
  .get(authenticate, getChatById)
  .delete(authenticate, deleteOneOnOneChat);


router.route("/:chatId/me").delete(authenticate, deleteChatForMe);
router
  .route("/group")
  .post(chatCreationRateLimiter, authenticate, createAGroupChat);

router
  .route("/group/:chatId")
  .get(authenticate, getGroupChatDetails)
  .patch(chatCreationRateLimiter, authenticate, updateGroupChat)
  .delete(authenticate, deleteGroupChat);

router
  .route("/group/:chatId/participants")
  .post(chatCreationRateLimiter, authenticate, addNewParticipantInGroupChat);
router
  .route("/group/:chatId/participants/:userId")
  .delete(authenticate, removeParticipantFromGroupChat);

router.route("/group/:chatId/leave").delete(authenticate, leaveGroupChat);


router
  .route("/:chatId/pin/:messageId")
  .post(authenticate, pinMessage)
  .delete(authenticate, unpinMessage);

export default router;
