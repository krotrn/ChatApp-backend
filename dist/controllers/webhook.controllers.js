"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_models_1 = require("../models/chat.models");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    const { userId, action, data } = req.body;
    try {
        if (action === "delete") {
            await chat_models_1.Chat.updateMany({ "participants.userId": userId }, { $pull: { participants: { userId } } });
        }
        else if (action === "update") {
            const { name, avatarUrl } = data;
            await chat_models_1.Chat.updateMany({ "participants.userId": userId }, {
                $set: {
                    "participants.$.name": name,
                    "participants.$.avatarUrl": avatarUrl,
                },
            });
        }
        res.status(200).json({ message: "User update processed" });
    }
    catch (error) {
        const apiError = new ApiError_1.default(500, "Internal server error");
        apiError.stack = error instanceof Error ? error.stack : undefined;
        throw apiError;
    }
});
exports.default = router;
//# sourceMappingURL=webhook.controllers.js.map