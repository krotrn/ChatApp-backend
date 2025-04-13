"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chat_controllers_1 = require("../controllers/chat.controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router
    .route("/")
    .get(chat_controllers_1.getAllChats)
    .post(rateLimit_middleware_1.chatCreationRateLimiter, chat_controllers_1.createOrGetAOneOnOneChat);
router
    .route("/group")
    .post(rateLimit_middleware_1.chatCreationRateLimiter, chat_controllers_1.createAGroupChat)
    .get(chat_controllers_1.getGroupChatDetails);
router
    .route("/group/:chatId")
    .delete(chat_controllers_1.deleteGroupChat)
    .patch(rateLimit_middleware_1.chatCreationRateLimiter, chat_controllers_1.renameGroupChat);
router
    .route("/group/:chatId/participants")
    .post(rateLimit_middleware_1.chatCreationRateLimiter, chat_controllers_1.addNewParticipantInGroupChat)
    .delete(chat_controllers_1.removeParticipantFromGroupChat);
router.route("/group/:chatId/leave").post(chat_controllers_1.leaveGroupChat);
router
    .route("/:chatId")
    .get(chat_controllers_1.getChatById)
    .delete(chat_controllers_1.deleteOneOnOneChat);
router.route("/:chatId/delete-for-me").delete(chat_controllers_1.deleteChatForMe);
router
    .route("/:chatId/pin/:messageId")
    .post(chat_controllers_1.pinMessage)
    .delete(chat_controllers_1.unpinMessage);
exports.default = router;
//# sourceMappingURL=chat.routes.js.map