"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const message_controllers_1 = require("../controllers/message.controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path_1.default.join(process.cwd(), "public", "images"));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});
router.use(auth_middleware_1.authenticate);
router
    .route("/:chatId")
    .get(rateLimit_middleware_1.messageRateLimiter, message_controllers_1.getAllMessages)
    .post(rateLimit_middleware_1.messageRateLimiter, rateLimit_middleware_1.fileUploadRateLimiter, upload.array("attachments", 5), message_controllers_1.sendMessage);
router
    .route("/:chatId/:messageId")
    .delete(rateLimit_middleware_1.messageRateLimiter, message_controllers_1.deleteMessage)
    .post(rateLimit_middleware_1.messageRateLimiter, message_controllers_1.replyMessage);
router.route("/:chatId/:messageId/reaction").post(rateLimit_middleware_1.messageRateLimiter, message_controllers_1.updateReaction);
exports.default = router;
//# sourceMappingURL=message.routes.js.map