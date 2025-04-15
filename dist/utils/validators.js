"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMessageInput = exports.validateFileType = exports.validateFileSize = exports.validateParticipantCount = exports.validateChatName = exports.validateMessageContent = void 0;
const ApiError_1 = __importDefault(require("./ApiError"));
const validateMessageContent = (content) => {
    if (!content || typeof content !== "string") {
        return false;
    }
    const trimmedContent = content.trim();
    return trimmedContent.length > 0 && trimmedContent.length <= 1000;
};
exports.validateMessageContent = validateMessageContent;
const validateChatName = (name) => {
    if (!name || typeof name !== "string") {
        return false;
    }
    const trimmedName = name.trim();
    return trimmedName.length > 0 && trimmedName.length <= 50;
};
exports.validateChatName = validateChatName;
const validateParticipantCount = (participants) => {
    return participants.length >= 2 && participants.length <= 100;
};
exports.validateParticipantCount = validateParticipantCount;
const validateFileSize = (file) => {
    const maxSize = 5 * 1024 * 1024;
    return file.size <= maxSize;
};
exports.validateFileSize = validateFileSize;
const validateFileType = (file) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "text/plain",
    ];
    return allowedTypes.includes(file.mimetype);
};
exports.validateFileType = validateFileType;
const validateMessageInput = (content, files) => {
    if (!content && (!files || files.length === 0)) {
        throw new ApiError_1.default(400, "Message content or attachment is required");
    }
    if (content && !(0, exports.validateMessageContent)(content)) {
        throw new ApiError_1.default(400, "Message content must be between 1 and 1000 characters");
    }
    if (files) {
        for (const file of files) {
            if (!(0, exports.validateFileSize)(file)) {
                throw new ApiError_1.default(400, "File size must be less than 5MB");
            }
            if (!(0, exports.validateFileType)(file)) {
                throw new ApiError_1.default(400, "Invalid file type");
            }
        }
    }
};
exports.validateMessageInput = validateMessageInput;
//# sourceMappingURL=validators.js.map