"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatById = exports.deleteChatForMe = exports.unpinMessage = exports.pinMessage = exports.deleteOneOnOneChat = exports.removeParticipantFromGroupChat = exports.getAllChats = exports.addNewParticipantInGroupChat = exports.leaveGroupChat = exports.getGroupChatDetails = exports.renameGroupChat = exports.deleteGroupChat = exports.createAGroupChat = exports.createOrGetAOneOnOneChat = exports.deleteCascadeChatMessages = exports.chatCommonAggregation = void 0;
const mongoose_1 = require("mongoose");
const chat_models_1 = require("../models/chat.models");
const message_models_1 = require("../models/message.models");
const socket_1 = require("../socket");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const ApiResponse_1 = require("../utils/ApiResponse");
const apiRetry_1 = require("../utils/apiRetry");
const constants_1 = require("../utils/constants");
const fileOperations_1 = require("../utils/fileOperations");
const userHelper_1 = require("../utils/userHelper");
const message_1 = require("./message");
const chatCommonAggregation = () => {
    return [
        {
            $lookup: {
                from: "chatmessages",
                let: { lastMessageId: "$lastMessage" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$lastMessageId"] },
                        },
                    },
                    ...(0, message_1.chatMessageCommonAggregation)(),
                ],
                as: "lastMessage",
            },
        },
        {
            $lookup: {
                from: "chatmessages",
                let: { chatId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$chatId", "$$chatId"] },
                        },
                    },
                    ...(0, message_1.chatMessageCommonAggregation)(),
                    {
                        $sort: { createdAt: -1 },
                    },
                ],
                as: "messages",
            },
        },
        {
            $addFields: {
                _id: { $toString: "$_id" },
                lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
            },
        },
    ];
};
exports.chatCommonAggregation = chatCommonAggregation;
// Get All Chats
const getAllChats = async (req, res) => {
    const chats = await chat_models_1.Chat.aggregate([
        {
            $match: {
                participants: {
                    $elemMatch: { userId: req.user.id },
                },
                deletedFor: {
                    $not: {
                        $elemMatch: { user: req.user.id },
                    },
                },
            },
        },
        {
            $sort: { updatedAt: -1 },
        },
        ...chatCommonAggregation(),
    ]);
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, chats || [], "User chats fetched successfully!"));
};
exports.getAllChats = getAllChats;
// Create or Get A One-on-One Chat
const createOrGetAOneOnOneChat = async (req, res) => {
    const session = await (0, mongoose_1.startSession)();
    session.startTransaction();
    try {
        const { participants, name, } = req.body;
        const currentUser = req.user;
        const otherParticipant = participants[0];
        if (otherParticipant.userId === currentUser.id) {
            throw new ApiError_1.default(400, "You cannot chat with yourself");
        }
        // Validate other participant first
        const usersToAdd = await (0, userHelper_1.validateUser)([otherParticipant.userId]);
        if (!usersToAdd.length) {
            throw new ApiError_1.default(403, "Invalid User.");
        }
        const currentUserParticipant = {
            userId: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
        };
        // Check for existing chat
        const existingChat = await chat_models_1.Chat.aggregate([
            {
                $match: {
                    type: "direct",
                    participants: {
                        $all: [
                            { $elemMatch: { userId: currentUser.id } },
                            { $elemMatch: { userId: otherParticipant.userId } },
                        ],
                    },
                },
            },
            ...chatCommonAggregation(),
        ]);
        if (existingChat.length) {
            await session.commitTransaction();
            res
                .status(200)
                .json(new ApiResponse_1.ApiResponse(200, existingChat[0], "Chat retrieved successfully"));
            return;
        }
        // Create new chat
        const newChatInstance = await chat_models_1.Chat.create([
            {
                name,
                type: "direct",
                participants: [currentUserParticipant, otherParticipant],
                admin: currentUser.id,
                createdBy: currentUser.id,
            },
        ], { session });
        const createChat = await chat_models_1.Chat.aggregate([
            { $match: { _id: newChatInstance[0]._id } },
            ...chatCommonAggregation(),
        ]);
        const payload = createChat[0];
        if (!payload) {
            throw new ApiError_1.default(500, "Internal Server error");
        }
        await session.commitTransaction();
        payload.participants.forEach(async (participant) => {
            if (participant.userId === currentUser.id)
                return;
            await (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.NEW_CHAT_EVENT, payload);
        });
        res
            .status(201)
            .json(new ApiResponse_1.ApiResponse(201, payload, "Chat created successfully"));
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
exports.createOrGetAOneOnOneChat = createOrGetAOneOnOneChat;
// Delete Cascade Chat Messages
const deleteCascadeChatMessages = async (chatId) => {
    const session = await (0, mongoose_1.startSession)();
    session.startTransaction();
    try {
        const messages = await message_models_1.ChatMessage.find({ chatId });
        for (const message of messages) {
            if (message.attachments?.length) {
                for (const attachment of message.attachments) {
                    try {
                        await (0, fileOperations_1.removeLocalFile)(attachment.localPath);
                    }
                    catch (error) {
                        console.error(`Failed to delete file: ${attachment.localPath}`, error);
                        // Continue with other files even if one fails
                    }
                }
            }
        }
        await message_models_1.ChatMessage.deleteMany({ chatId }, { session });
        await session.commitTransaction();
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
exports.deleteCascadeChatMessages = deleteCascadeChatMessages;
// Delete One-on-One Chat
const deleteOneOnOneChat = async (req, res) => {
    const session = await (0, mongoose_1.startSession)();
    session.startTransaction();
    try {
        const { chatId } = req.params;
        const chat = await chat_models_1.Chat.aggregate([
            { $match: { _id: new mongoose_1.Types.ObjectId(chatId) } },
            ...chatCommonAggregation(),
        ]);
        const payload = chat[0];
        if (!payload) {
            throw new ApiError_1.default(404, "Chat does not exist");
        }
        await chat_models_1.Chat.findByIdAndDelete(chatId, { session });
        await deleteCascadeChatMessages(chatId);
        const otherParticipant = payload?.participants?.find((participant) => participant.userId !== req.user.id.toString());
        if (!otherParticipant) {
            throw new ApiError_1.default(404, "Other user not found.");
        }
        await session.commitTransaction();
        await (0, socket_1.emitSocketEvent)(req, otherParticipant.userId, constants_1.ChatEventEnum.DELETE_CHAT_EVENT, payload);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, {}, "Chat deleted successfully"));
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
exports.deleteOneOnOneChat = deleteOneOnOneChat;
// Get Chat By Id
const getChatById = async (req, res) => {
    const { chatId } = req.params;
    if (!chatId) {
        throw new ApiError_1.default(404, "Chat ID is required");
    }
    const chats = await chat_models_1.Chat.aggregate([
        { $match: { _id: new mongoose_1.Types.ObjectId(chatId) } },
        ...chatCommonAggregation(),
    ]);
    if (!chats || chats.length === 0) {
        throw new ApiError_1.default(404, "Chat not found");
    }
    const chat = chats[0];
    res.status(200).json(new ApiResponse_1.ApiResponse(200, chat, "Chat fetched successfully"));
};
exports.getChatById = getChatById;
// Delete Chat For Me
const deleteChatForMe = async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    const chat = await chat_models_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiError_1.default(404, "Chat not found");
    }
    if (!chat.participants.some((p) => p.userId === userId)) {
        throw new ApiError_1.default(403, "You are not a participant of this chat");
    }
    if (chat.deletedFor.some((df) => df.userId === userId)) {
        throw new ApiError_1.default(400, "Chat already deleted for you");
    }
    chat.deletedFor.push({ user: userId, deletedAt: new Date() });
    await chat.save();
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, {}, "Chat deleted for you successfully"));
};
exports.deleteChatForMe = deleteChatForMe;
// Create A Group Chat
const createAGroupChat = async (req, res) => {
    const { name, participants, } = req.body;
    if (participants.some((participant) => participant.userId === req.user.id)) {
        throw new ApiError_1.default(400, "Participants array should not contain the group creator");
    }
    const member = [
        ...new Set([
            ...participants.map((p) => p.userId),
            req.user.id,
        ]),
    ];
    if (member.length < 3) {
        throw new ApiError_1.default(400, "Seems like you have passed duplicate participants.");
    }
    await Promise.all(participants.map(async (user) => {
        if (!(await (0, apiRetry_1.resilientApiCall)(() => (0, userHelper_1.validateUser)([user.userId])))) {
            throw new ApiError_1.default(400, `User ${user.userId} not found`);
        }
    }));
    const groupChat = await chat_models_1.Chat.create({
        name,
        type: "group",
        participants: member.map((userId) => ({ userId, joinedAt: new Date() })),
        admin: req.user.id,
        createdBy: req.user.id,
    });
    const chat = await chat_models_1.Chat.aggregate([
        { $match: { _id: groupChat._id } },
        ...chatCommonAggregation(),
    ]);
    const payload = chat[0];
    if (!payload) {
        throw new ApiError_1.default(500, "Internal server error");
    }
    payload.participants.forEach(async (participant) => {
        if (participant.userId === req.user.id)
            return;
        (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.NEW_CHAT_EVENT, payload);
    });
    res
        .status(201)
        .json(new ApiResponse_1.ApiResponse(201, payload, "Group chat created successfully"));
};
exports.createAGroupChat = createAGroupChat;
// Get Group Chat Details
const getGroupChatDetails = async (req, res) => {
    const { chatId } = req.params;
    const groupChat = await chat_models_1.Chat.aggregate([
        { $match: { _id: new mongoose_1.Types.ObjectId(chatId), type: "group" } },
        ...chatCommonAggregation(),
    ]);
    const chat = groupChat[0];
    if (!chat) {
        throw new ApiError_1.default(404, "Group chat does not exist");
    }
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, chat, "Group chat fetched successfully"));
};
exports.getGroupChatDetails = getGroupChatDetails;
// Rename Group Chat
const renameGroupChat = async (req, res) => {
    const { chatId } = req.params;
    const { name } = req.body;
    const groupChat = await chat_models_1.Chat.findOne({
        _id: new mongoose_1.Types.ObjectId(chatId),
        type: "group",
    });
    if (!groupChat) {
        throw new ApiError_1.default(404, "Group chat does not exist");
    }
    if (groupChat.admin !== req.user.id) {
        throw new ApiError_1.default(403, "You are not an admin");
    }
    const updatedGroupChat = await chat_models_1.Chat.findByIdAndUpdate(chatId, { $set: { name } }, { new: true });
    if (!updatedGroupChat) {
        throw new ApiError_1.default(404, "Cannot update name of group chat.");
    }
    const chat = await chat_models_1.Chat.aggregate([
        { $match: { _id: updatedGroupChat._id } },
        ...chatCommonAggregation(),
    ]);
    const payload = chat[0];
    if (!payload) {
        throw new ApiError_1.default(500, "Internal server error");
    }
    payload.participants.forEach((participant) => {
        (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.UPDATE_GROUP_NAME_EVENT, payload);
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, payload, "Group chat name updated successfully"));
};
exports.renameGroupChat = renameGroupChat;
// Delete Group Chat
const deleteGroupChat = async (req, res) => {
    const { chatId } = req.params;
    const groupChat = await chat_models_1.Chat.aggregate([
        { $match: { _id: new mongoose_1.Types.ObjectId(chatId), type: "group" } },
        ...chatCommonAggregation(),
    ]);
    const chat = groupChat[0];
    if (!chat) {
        throw new ApiError_1.default(404, "Group chat does not exist");
    }
    if (chat.admin !== req.user.id) {
        throw new ApiError_1.default(403, "Only admin can delete the group");
    }
    const session = await (0, mongoose_1.startSession)();
    try {
        session.startTransaction();
        await chat_models_1.Chat.findByIdAndDelete(chatId).session(session);
        await message_models_1.ChatMessage.deleteMany({ chat: new mongoose_1.Types.ObjectId(chatId) }).session(session);
        await session.commitTransaction();
    }
    catch (error) {
        if (error instanceof Error) {
            console.log(error.message);
            throw new ApiError_1.default(500, error.message);
        }
        await session.abortTransaction();
        throw new ApiError_1.default(500, "Failed to delete chat");
    }
    finally {
        session.endSession();
    }
    chat.participants.forEach((participant) => {
        if (participant.userId === req.user.id)
            return;
        (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.DELETE_CHAT_EVENT, chat);
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, [], "Group chat deleted successfully"));
};
exports.deleteGroupChat = deleteGroupChat;
// Add New Participant In Group Chat
const addNewParticipantInGroupChat = async (req, res) => {
    const { chatId } = req.params;
    const { participants } = req.body;
    const chat = await chat_models_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiError_1.default(404, "Chat does not exist");
    }
    if (chat.type !== "group") {
        throw new ApiError_1.default(400, "This feature is only available for group chats");
    }
    if (chat.admin?.toString() !== req.user.id.toString()) {
        throw new ApiError_1.default(403, "You are not an admin");
    }
    const existingParticipants = chat.participants.map((participant) => participant.userId.toString());
    const newParticipants = participants.filter((participantId) => !existingParticipants.includes(participantId));
    if (!newParticipants.length) {
        throw new ApiError_1.default(400, "No new participants to add");
    }
    const usersToAdd = await (0, userHelper_1.validateUser)(newParticipants);
    const newParticipantObjects = usersToAdd.map((user) => ({
        userId: user._id,
        name: user.fullName,
        avatarUrl: user.avatar,
        role: "member",
        joinedAt: new Date(),
    }));
    chat.participants.push(...newParticipantObjects);
    await chat.save();
    const chatWithParticipants = await chat_models_1.Chat.findById(chatId).populate("participants.userId", "fullName avatar");
    (0, socket_1.emitSocketEvent)(req, chatId, constants_1.ChatEventEnum.NEW_PARTICIPANT_ADDED_EVENT, chatWithParticipants);
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, chatWithParticipants, "New participants added successfully"));
};
exports.addNewParticipantInGroupChat = addNewParticipantInGroupChat;
// Remove Participant From Group Chat
const removeParticipantFromGroupChat = async (req, res) => {
    const { chatId, participantId } = req.params;
    const chat = await chat_models_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiError_1.default(404, "Chat does not exist");
    }
    if (chat.type !== "group") {
        throw new ApiError_1.default(400, "This feature is only available for group chats");
    }
    if (chat.admin?.toString() !== req.user.id.toString()) {
        throw new ApiError_1.default(403, "You are not an admin");
    }
    const participantExists = chat.participants.find((participant) => participant.userId.toString() === participantId);
    if (!participantExists) {
        throw new ApiError_1.default(404, "Participant does not exist in the group chat");
    }
    chat.participants = chat.participants.filter((participant) => participant.userId.toString() !== participantId);
    await chat.save();
    const chatWithParticipants = await chat_models_1.Chat.findById(chatId).populate("participants.userId", "fullName avatar");
    (0, socket_1.emitSocketEvent)(req, chatId, constants_1.ChatEventEnum.PARTICIPANT_LEFT_EVENT, chatWithParticipants);
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, chatWithParticipants, "Participant removed successfully"));
};
exports.removeParticipantFromGroupChat = removeParticipantFromGroupChat;
// Leave Group Chat
const leaveGroupChat = async (req, res) => {
    const { chatId } = req.params;
    const chat = await chat_models_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiError_1.default(404, "Chat does not exist");
    }
    if (chat.type !== "group") {
        throw new ApiError_1.default(400, "This feature is only available for group chats");
    }
    const participantExists = chat.participants.find((participant) => participant.userId.toString() ===
        req.user.id.toString());
    if (!participantExists) {
        throw new ApiError_1.default(404, "You are not a participant of the group chat");
    }
    chat.participants = chat.participants.filter((participant) => participant.userId.toString() !==
        req.user.id.toString());
    await chat.save();
    const chatWithParticipants = await chat_models_1.Chat.findById(chatId).populate("participants.userId", "fullName avatar");
    (0, socket_1.emitSocketEvent)(req, chatId, constants_1.ChatEventEnum.PARTICIPANT_LEFT_EVENT, chatWithParticipants);
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, chatWithParticipants, "Left group successfully"));
};
exports.leaveGroupChat = leaveGroupChat;
// Pin Messages
const pinMessage = async (req, res) => {
    const { chatId, messageId } = req.params;
    const chat = await chat_models_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiError_1.default(404, "Chat not found");
    }
    if (chat.admin !== req.user.id) {
        throw new ApiError_1.default(403, "Only admin can pin messages");
    }
    const updatedChat = await chat_models_1.Chat.findByIdAndUpdate(chatId, {
        $addToSet: { "metadata.pinnedMessage": new mongoose_1.Types.ObjectId(messageId) },
    }, { new: true });
    if (!updatedChat)
        throw new ApiError_1.default(400, "Error pinning message");
    updatedChat.participants.forEach((participant) => {
        if (participant.userId === req.user.id)
            return;
        (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.MESSAGE_PIN_EVENT, updatedChat);
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, updatedChat, "Message pinned successfully"));
};
exports.pinMessage = pinMessage;
// Unpin Messages
const unpinMessage = async (req, res) => {
    const { chatId, messageId } = req.params;
    const chat = await chat_models_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiError_1.default(404, "Chat not found");
    }
    if (chat.admin !== req.user.id) {
        throw new ApiError_1.default(403, "Only admin can unpin messages");
    }
    const updatedChat = await chat_models_1.Chat.findByIdAndUpdate(chatId, {
        $pull: { "metadata.pinnedMessage": new mongoose_1.Types.ObjectId(messageId) },
    }, { new: true });
    if (!updatedChat) {
        throw new ApiError_1.default(400, "No pinned message found");
    }
    updatedChat.participants.forEach((participant) => {
        if (participant.userId === req.user.id)
            return;
        (0, socket_1.emitSocketEvent)(req, participant.userId, constants_1.ChatEventEnum.MESSAGE_PIN_EVENT, updatedChat);
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, updatedChat, "Message unpinned successfully"));
};
exports.unpinMessage = unpinMessage;
//# sourceMappingURL=chat.js.map