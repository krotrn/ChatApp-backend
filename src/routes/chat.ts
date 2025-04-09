import express from "express";
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
  renameGroupChat,
  unpinMessage,
} from "../controllers/chat";
import { authenticate } from "../middleware/auth";
import { chatCreationRateLimiter } from "../middleware/rateLimit";

const router = express.Router();

router.use(authenticate);

router
  .route("/")
  .get(getAllChats)
  .post(chatCreationRateLimiter, createOrGetAOneOnOneChat);

router
  .route("/group")
  .post(chatCreationRateLimiter, createAGroupChat)
  .get(getGroupChatDetails);

router
  .route("/group/:chatId")
  .delete(deleteGroupChat)
  .patch(chatCreationRateLimiter, renameGroupChat);

router
  .route("/group/:chatId/participants")
  .post(chatCreationRateLimiter, addNewParticipantInGroupChat)
  .delete(removeParticipantFromGroupChat);

router.route("/group/:chatId/leave").post(leaveGroupChat);

router.route("/:chatId").get(getChatById).delete(deleteOneOnOneChat);

router.route("/:chatId/delete-for-me").delete(deleteChatForMe);

router.route("/:chatId/pin/:messageId").post(pinMessage).delete(unpinMessage);

export default router;
