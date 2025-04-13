"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const message_1 = require("../types/message");
const attachmentSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    url: String,
    localPath: String,
    status: {
        type: String,
        enum: Object.values(message_1.StatusEnum),
        default: message_1.StatusEnum.sent,
    },
    type: {
        type: String,
        required: true,
    },
});
const reactionSchema = new mongoose_1.Schema({
    userId: String,
    emoji: String,
    timestamp: Date,
});
const editSchema = new mongoose_1.Schema({
    content: String,
    editedAt: { type: Date, default: Date.now },
    editedBy: String,
});
const readBySchema = new mongoose_1.Schema({
    userId: String,
    readAt: { type: Date, default: Date.now },
});
const deletedForSchema = new mongoose_1.Schema({
    userId: String,
    deletedAt: { type: Date, default: Date.now },
});
const userSchema = new mongoose_1.Schema({
    userId: String,
    name: String,
    avatarUrl: String,
});
const chatMessageSchema = new mongoose_1.Schema({
    sender: userSchema,
    receivers: {
        type: [userSchema],
        default: [],
    },
    chatId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
        index: true,
    },
    attachments: {
        type: [attachmentSchema],
        default: [],
    },
    reactions: {
        type: [reactionSchema],
        default: [],
    },
    edited: {
        isEdited: { type: Boolean, default: false },
        editedAt: { type: Date, default: Date.now },
    },
    edits: {
        type: [editSchema],
        default: [],
    },
    readBy: {
        type: [readBySchema],
        default: [],
    },
    deletedFor: {
        type: [deletedForSchema],
        default: [],
    },
    replyToId: { type: mongoose_1.Schema.Types.ObjectId, ref: "ChatMessage" },
    formatting: {
        type: Map,
        of: String,
        default: new Map(),
    },
}, {
    timestamps: true,
});
chatMessageSchema.index({ chatId: 1, createdAt: -1 });
exports.ChatMessage = mongoose_1.default.models.ChatMessage ||
    mongoose_1.default.model("ChatMessage", chatMessageSchema);
//# sourceMappingURL=message.models.js.map