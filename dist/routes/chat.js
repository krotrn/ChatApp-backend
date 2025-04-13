"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chat_1 = require("../controllers/chat");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router
    .route("/")
    .get(chat_1.getAllChats)
    .post(rateLimit_1.chatCreationRateLimiter, chat_1.createOrGetAOneOnOneChat);
router
    .route("/group")
    .post(rateLimit_1.chatCreationRateLimiter, chat_1.createAGroupChat)
    .get(chat_1.getGroupChatDetails);
router
    .route("/group/:chatId")
    .delete(chat_1.deleteGroupChat)
    .patch(rateLimit_1.chatCreationRateLimiter, chat_1.renameGroupChat);
router
    .route("/group/:chatId/participants")
    .post(rateLimit_1.chatCreationRateLimiter, chat_1.addNewParticipantInGroupChat)
    .delete(chat_1.removeParticipantFromGroupChat);
router.route("/group/:chatId/leave").post(chat_1.leaveGroupChat);
router.route("/:chatId").get(chat_1.getChatById).delete(chat_1.deleteOneOnOneChat);
router.route("/:chatId/delete-for-me").delete(chat_1.deleteChatForMe);
router.route("/:chatId/pin/:messageId").post(chat_1.pinMessage).delete(chat_1.unpinMessage);
exports.default = router;
//# sourceMappingURL=chat.js.map