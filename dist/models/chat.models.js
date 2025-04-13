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
exports.Chat = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const participantSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    role: { type: String, enum: ["member", "admin"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
});
const chatSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    lastMessage: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ChatMessage",
    },
    avatarUrl: {
        type: String,
        default: "",
    },
    participants: [participantSchema],
    admin: {
        type: String,
    },
    type: {
        type: String,
        enum: ["direct", "group", "channel"],
        required: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
    deletedFor: {
        type: [
            {
                userId: String,
                deletedAt: Date,
            },
        ],
        default: [],
    },
    metadata: {
        pinnedMessage: [
            {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "ChatMessage",
            },
        ],
        customePermissions: mongoose_1.Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});
chatSchema.index({ participants: 1, updatedAt: -1 });
exports.Chat = mongoose_1.default.models.Chat || mongoose_1.default.model("Chat", chatSchema);
//# sourceMappingURL=chat.models.js.map