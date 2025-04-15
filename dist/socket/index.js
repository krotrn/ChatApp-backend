"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitSocketEvent = exports.initializeSocketIO = void 0;
const authSocket_1 = __importDefault(require("../middleware/authSocket"));
const constants_1 = require("../utils/constants");
const initializeSocketIO = (io) => {
    io.use(authSocket_1.default);
    io.on("connection", async (socket) => {
        try {
            if (!socket.user) {
                console.error("Unauthorized socket connection attempt");
                return socket.disconnect(true);
            }
            socket.join(socket.user.id);
            socket.emit(constants_1.ChatEventEnum.CONNECTED_EVENT);
            console.error("User connected. userId:", socket.user.id);
            // Joining a chat room
            socket.on(constants_1.ChatEventEnum.ONLINE_EVENT, (chatId) => {
                console.error(`User joined the chat. chatId:`, chatId);
                socket.join(chatId);
            });
            // Typing events
            socket.on(constants_1.ChatEventEnum.TYPING_EVENT, (chatId) => {
                socket.to(chatId).emit(constants_1.ChatEventEnum.TYPING_EVENT, chatId);
            });
            socket.on(constants_1.ChatEventEnum.STOP_TYPING_EVENT, (chatId) => {
                socket.to(chatId).emit(constants_1.ChatEventEnum.STOP_TYPING_EVENT, chatId);
            });
            socket.on(constants_1.ChatEventEnum.DISCONNECT_EVENT, async () => {
                if (socket.user) {
                    console.error("User disconnected. userId:", socket.user.id);
                    socket.leave(socket.user.id);
                }
            });
        }
        catch (error) {
            console.error("Socket connection error:", error);
            socket.emit(constants_1.ChatEventEnum.SOCKET_ERROR_EVENT, error?.message || "An error occurred while connecting.");
        }
    });
};
exports.initializeSocketIO = initializeSocketIO;
const emitSocketEvent = (req, roomId, event, payload) => {
    const io = req.app.get("io");
    if (!io) {
        console.error("Socket.io instance not found");
        return;
    }
    io.to(roomId).emit(event, payload);
};
exports.emitSocketEvent = emitSocketEvent;
//# sourceMappingURL=index.js.map