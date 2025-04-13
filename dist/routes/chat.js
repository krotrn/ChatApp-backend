"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_1 = require("../controllers/chat");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
router
    .route("/")
    .get(auth_1.authenticate, chat_1.getAllChats)
    .post(rateLimit_1.chatCreationRateLimiter, auth_1.authenticate, chat_1.createOrGetAOneOnOneChat);
router
    .route("/group")
    .post(rateLimit_1.chatCreationRateLimiter, auth_1.authenticate, chat_1.createAGroupChat)
    .get(auth_1.authenticate, chat_1.getGroupChatDetails);
router
    .route("/group/:chatId")
    .delete(auth_1.authenticate, chat_1.deleteGroupChat)
    .patch(rateLimit_1.chatCreationRateLimiter, auth_1.authenticate, chat_1.updateGroupChat);
router
    .route("/group/:chatId/participants")
    .post(rateLimit_1.chatCreationRateLimiter, auth_1.authenticate, chat_1.addNewParticipantInGroupChat)
    .delete(auth_1.authenticate, chat_1.removeParticipantFromGroupChat);
router.route("/group/:chatId/leave").post(auth_1.authenticate, chat_1.leaveGroupChat);
router
    .route("/:chatId")
    .get(auth_1.authenticate, chat_1.getChatById)
    .delete(auth_1.authenticate, chat_1.deleteOneOnOneChat);
router.route("/:chatId/delete-for-me").delete(auth_1.authenticate, chat_1.deleteChatForMe);
router
    .route("/:chatId/pin/:messageId")
    .post(auth_1.authenticate, chat_1.pinMessage)
    .delete(auth_1.authenticate, chat_1.unpinMessage);
exports.default = router;
//# sourceMappingURL=chat.js.map