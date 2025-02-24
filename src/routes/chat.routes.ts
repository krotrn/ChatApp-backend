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
  deleteChatForMe,
} from "../controllers/chat.controllers";
import authenticate from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware
router.use(authenticate);

// Chat routes
router.get("/", getAllChats);
router.post("/chat", createOrGetAOneOnOneChat);
router.delete("/chat/:chatId", deleteOneOnOneChat);
router.delete("/chat/:chatId/me", deleteChatForMe);

// Group chat routes
router.post("/group", createAGroupChat);
router
  .route("/group/:chatId")
  .get(getGroupChatDetails)
  .patch(renameGroupChat)
  .delete(deleteGroupChat);

router.post("/group/:chatId/participant/:participantId", addNewParticipantInGroupChat);
router.delete("/group/:chatId/participant/:participantId", removeParticipantFromGroupChat);
router.delete("/group/:chatId/leave", leaveGroupChat);

// Pin/Unpin message routes
router.post("/chat/:chatId/pin/:messageId", pinMessage);
router.delete("/chat/:chatId/pin/:messageId", unpinMessage);

export default router;
