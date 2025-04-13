"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReaction = exports.replyMessage = exports.deleteMessage = exports.sendMessage = exports.getAllMessages = exports.chatMessageCommonAggregation = void 0;
const chat_models_1 = require("../models/chat.models");
const message_models_1 = require("../models/message.models");
const message_1 = require("../types/message");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const ApiResponse_1 = require("../utils/ApiResponse");
const FileOperations_1 = require("../utils/FileOperations");
const FileOperations_2 = require("../utils/FileOperations");
const userHelper_1 = require("../utils/userHelper");
const validators_1 = require("../utils/validators");
const mongoose_1 = require("mongoose");
const socket_1 = require("../socket");
const constants_1 = require("../utils/constants");
const chatMessageCommonAggregation = () => {
    return [
        {
            $project: {
                sender: 1,
                receivers: 1,
                content: 1,
                attachments: 1,
                status: 1,
                reactions: 1,
                edited: 1,
                isDeleted: 1,
                replyTo: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
        {
            $addFields: {
                _id: { $toString: "$_id" },
                chatId: { $toString: "$chatId" },
                replyTo: {
                    $cond: {
                        if: { $ne: ["$replyTo", null] },
                        then: { $toString: "$replyTo" },
                        else: null,
                    },
                },
            },
        },
    ];
};
exports.chatMessageCommonAggregation = chatMessageCommonAggregation;
const getAllMessages = async (req, res) => {
    const { chatId } = req.params;
    const selectedChat = await chat_models_1.Chat.findById(chatId);
    if (!selectedChat) {
        throw new ApiError_1.default(404, "Chat does not exist.");
    }
    if (!selectedChat.participants.some((participant) => participant.userId === req.user.id)) {
        throw new ApiError_1.default(400, "User is not part of chat.");
    }
    const messages = await message_models_1.ChatMessage.aggregate([
        {
            $match: {
                chatId: new mongoose_1.Types.ObjectId(chatId),
            },
        },
        ...(0, exports.chatMessageCommonAggregation)(),
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, messages, "Messages fetched successfully"));
};
exports.getAllMessages = getAllMessages;
const sendMessage = async (req, res) => {
    const session = await (0, mongoose_1.startSession)();
    session.startTransaction();
    try {
        const { chatId } = req.params;
        const { content } = req.body;
        // Validate message input
        let attachments = [];
        if (!Array.isArray(req.files) && req.files?.attachments) {
            attachments = req.files.attachments;
        }
        else if (Array.isArray(req.files)) {
            attachments = req.files;
        }
        (0, validators_1.validateMessageInput)(content, attachments);
        const selectedChat = await chat_models_1.Chat.findById(chatId);
        if (!selectedChat) {
            throw new ApiError_1.default(404, "Chat does not exist");
        }
        const receivers = selectedChat.participants.filter((participant) => participant.userId !== req.user.id);
        if (!receivers.length) {
            throw new ApiError_1.default(400, "Unable to determine message receiver");
        }
        // Validate all receivers
        const receiverIds = receivers.map((user) => user.userId);
        const validReceivers = await (0, userHelper_1.validateUser)(receiverIds);
        if (validReceivers.length !== receiverIds.length) {
            throw new ApiError_1.default(400, "One or more receivers are invalid");
        }
        const messageFiles = attachments.map((attachment) => ({
            name: attachment.filename,
            url: (0, FileOperations_2.getStaticFilePath)(req, attachment.filename),
            localPath: (0, FileOperations_1.getLocalPath)(attachment.filename),
            type: attachment.mimetype || "application/octet-stream",
        }));
        const message = await message_models_1.ChatMessage.create([
            {
                sender: req.user.id,
                receivers,
                content: content || "",
                chatId: new mongoose_1.Types.ObjectId(chatId),
                attachments: messageFiles,
                status: message_1.StatusEnum.sent,
            },
        ], { session });
        const updateChat = await chat_models_1.Chat.findByIdAndUpdate(chatId, { $set: { lastMessage: message[0]._id } }, { new: true, session });
        const messages = await message_models_1.ChatMessage.aggregate([
            { $match: { _id: message[0]._id } },
            ...(0, exports.chatMessageCommonAggregation)(),
        ]);
        const receivedMessage = messages[0];
        if (!receivedMessage || !updateChat) {
            throw new ApiError_1.default(500, "Internal server error");
        }
        await session.commitTransaction();
        if (updateChat.type === "group") {
            await (0, socket_1.emitSocketEvent)(req, chatId, constants_1.ChatEventEnum.MESSAGE_RECEIVED_EVENT, receivedMessage);
        }
        else {
            for (const participant of updateChat.participants) {
                if (participant.userId === req.user.id)
                    continue;
                await (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.MESSAGE_RECEIVED_EVENT, receivedMessage);
            }
        }
        res
            .status(201)
            .json(new ApiResponse_1.ApiResponse(201, receivedMessage, "Message saved successfully"));
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
exports.sendMessage = sendMessage;
const deleteMessage = async (req, res) => {
    const session = await (0, mongoose_1.startSession)();
    session.startTransaction();
    try {
        const { chatId, messageId } = req.params;
        const currentUser = req.user;
        const chat = await chat_models_1.Chat.findById(chatId);
        if (!chat ||
            !chat.participants.some((participant) => participant.userId === currentUser.id)) {
            throw new ApiError_1.default(404, "Chat does not exist");
        }
        const message = await message_models_1.ChatMessage.findById(messageId);
        if (!message) {
            throw new ApiError_1.default(404, "Message does not exist");
        }
        const isAdmin = chat.admin === currentUser.id;
        const isSender = message.sender === currentUser.id;
        const isRecent = Date.now() - message.createdAt.getTime() < 24 * 60 * 60 * 1000;
        if (!isAdmin && !isSender) {
            throw new ApiError_1.default(403, "You are not authorized to delete this message");
        }
        if (!isAdmin && !isRecent) {
            throw new ApiError_1.default(403, "You can only delete messages less than 24 hours old");
        }
        if (message.attachments.length > 0) {
            for (const asset of message.attachments) {
                try {
                    await (0, FileOperations_1.removeLocalFile)(asset.localPath);
                }
                catch (error) {
                    console.error(`Failed to delete file: ${asset.localPath}`, error);
                }
            }
        }
        await message_models_1.ChatMessage.deleteOne({ _id: message._id }, { session });
        if (chat.lastMessage?.toString() === message._id.toString()) {
            const lastMessage = await message_models_1.ChatMessage.findOne({ chatId }, {}, { sort: { createdAt: -1 } });
            await chat_models_1.Chat.findByIdAndUpdate(chatId, {
                lastMessage: lastMessage ? lastMessage._id : null,
            }, { session });
        }
        await session.commitTransaction();
        for (const participant of chat.participants) {
            if (participant.userId === currentUser.id)
                continue;
            await (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.MESSAGE_DELETE_EVENT, message);
        }
        res
            .status(200)
            .json(new ApiResponse_1.ApiResponse(200, message, "Message deleted successfully"));
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
exports.deleteMessage = deleteMessage;
const replyMessage = async (req, res) => {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    if (!content) {
        throw new ApiError_1.default(400, "Reply content is required");
    }
    const chat = await chat_models_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiError_1.default(404, "Chat not found");
    }
    const receivers = chat.participants.filter((participant) => participant.userId !== req.user.id);
    if (!receivers.length) {
        throw new ApiError_1.default(400, "Unable to determine message receiver");
    }
    const reply = await message_models_1.ChatMessage.create({
        sender: req.user.id,
        receivers,
        content,
        chatId: new mongoose_1.Types.ObjectId(chatId),
        replyTo: messageId,
        attachments: [],
    });
    chat.lastMessage = reply._id;
    await chat.save();
    chat.participants.forEach((participant) => {
        if (participant.userId === req.user.id)
            return;
        (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.MESSAGE_RECEIVED_EVENT, reply);
    });
    res.status(201).json(new ApiResponse_1.ApiResponse(201, reply, "Reply sent successfully"));
};
exports.replyMessage = replyMessage;
const updateReaction = async (req, res) => {
    const { chatId, messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) {
        throw new ApiError_1.default(400, "Emoji is required for a reaction");
    }
    const chat = await chat_models_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiError_1.default(404, "Chat not found");
    }
    const message = await message_models_1.ChatMessage.findById(messageId);
    if (!message) {
        throw new ApiError_1.default(404, "Message not found");
    }
    const reactionIndex = message.reactions.findIndex((reaction) => reaction.userId === req.user.id);
    if (reactionIndex !== -1) {
        if (message.reactions[reactionIndex].emoji === emoji) {
            message.reactions.splice(reactionIndex, 1);
        }
        else {
            message.reactions[reactionIndex].emoji = emoji;
        }
    }
    else {
        message.reactions.push({
            userId: req.user.id,
            emoji,
            timestamp: new Date(),
        });
    }
    await message.save();
    chat.participants.forEach((participant) => {
        if (participant.userId === req.user.id)
            return;
        (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.MESSAGE_REACTION_EVENT, message);
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, message, "Reaction updated successfully"));
};
exports.updateReaction = updateReaction;
//# sourceMappingURL=message.js.map