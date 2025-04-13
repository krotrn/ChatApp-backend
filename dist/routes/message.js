"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_1 = require("../controllers/message");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const multer_1 = require("../middleware/multer");
const handleUploadErrors_1 = require("../middleware/handleUploadErrors");
const router = (0, express_1.Router)();
router
    .route("/:chatId")
    .get(rateLimit_1.messageRateLimiter, auth_1.authenticate, message_1.getAllMessages)
    .post(rateLimit_1.messageRateLimiter, rateLimit_1.fileUploadRateLimiter, multer_1.upload.array("attachments", 5), auth_1.authenticate, handleUploadErrors_1.handleUploadErrors, message_1.sendMessage);
router
    .route("/:chatId/:messageId")
    .delete(rateLimit_1.messageRateLimiter, auth_1.authenticate, message_1.deleteMessage);
router
    .route("/:chatId/:messageId/me")
    .delete(rateLimit_1.messageRateLimiter, auth_1.authenticate, message_1.deleteMessageForMe);
router
    .route("/:chatId/:messageId/edit")
    .patch(rateLimit_1.messageRateLimiter, auth_1.authenticate, message_1.editMessage);
router
    .route("/:chatId/read")
    .post(rateLimit_1.messageRateLimiter, auth_1.authenticate, message_1.markMessagesAsRead);
router
    .route("/:chatId/reply")
    .post(rateLimit_1.messageRateLimiter, auth_1.authenticate, message_1.replyMessage);
router
    .route("/:chatId/:messageId/reaction")
    .patch(rateLimit_1.messageRateLimiter, auth_1.authenticate, message_1.updateReaction);
exports.default = router;
//# sourceMappingURL=message.js.map