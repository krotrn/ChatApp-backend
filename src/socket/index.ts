import type { Server } from "socket.io";
import authSocket from "../middleware/authSocket";
import type { CustomSocket } from "../types/Socket";
import { ChatEventEnum } from "../utils/constants";

const onlineUserIds = new Map<string, string>();
const initializeSocketIO = (io: Server) => {
  io.use(authSocket);

  io.engine.on("connection_error", (err) => {
    console.error("Socket connection error:", err);
  });

  io.on("connection", async (socket: CustomSocket) => {
    try {
      if (!socket.user) {
        console.error("Unauthorized socket connection attempt, disconnecting.");
        return socket.disconnect(true);
      }
      const userId = socket.user.id;
      socket.join(userId);
      console.log(`User ${userId} connected and joined room ${userId}`);
      const currentOnlineUserIds = Array.from(onlineUserIds.keys());
      socket.emit(ChatEventEnum.ONLINE_USERS_LIST_EVENT, {
        onlineUserIds: currentOnlineUserIds,
      });
      console.log(`Sent online users list to ${userId}:`, currentOnlineUserIds);

      socket.on(ChatEventEnum.USER_ONLINE_EVENT, async () => {
        onlineUserIds.set(userId, socket.id);
        console.log(`User ${userId} is online.`);
        socket.broadcast.emit(ChatEventEnum.USER_IS_ONLINE_EVENT, { userId });
      });

      socket.on("ping", (data: { timestamp: number }, callback) => {
        console.log(`Health check ping from user ${userId} on socket ${socket.id} at ${data.timestamp}`);
        if (callback && typeof callback === "function") {
          callback({ timestamp: Date.now(), serverTime: Date.now() });
        }
      });

      socket.on(ChatEventEnum.JOIN_CHAT_EVENT, async (chatId: string) => {
        socket.join(chatId);
        console.log(`User ${userId} joined chat room ${chatId}`);
      });

      socket.on(ChatEventEnum.LEAVE_CHAT_EVENT, async (chatId: string) => {
        socket.leave(chatId);
        console.log(`User ${userId} left chat room ${chatId}`);
      });

      socket.on(
        ChatEventEnum.TYPING_EVENT,
        (data: { userId: string; chatId: string }) => {
          console.log(`User ${userId} is typing in chat ${data.chatId}`);
          socket.to(data.chatId).emit(ChatEventEnum.TYPING_EVENT, {
            userId,
            chatId: data.chatId,
          });
        }
      );

      socket.on(
        ChatEventEnum.STOP_TYPING_EVENT,
        (data: { userId: string; chatId: string }) => {
          console.log(`User ${userId} stopped typing in chat ${data.chatId}`);
          socket.to(data.chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, {
            userId,
            chatId: data.chatId,
          });
        }
      );

      socket.on("disconnect", () => {
        onlineUserIds.delete(userId);
        console.log(`User ${userId} disconnected.`);
        socket.leave(userId);
        socket.broadcast.emit(ChatEventEnum.USER_IS_OFFLINE_EVENT, { userId });
      });
    } catch (error) {
      console.error("Socket connection error:", error);
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        (error as Error)?.message || "An error occurred during connection."
      );
    }
  });
};

interface EmitSocketEventRequest {
  app: {
    get: (key: string) => Server | undefined;
  };
}
const emitSocketEvent = <T>(
  req: EmitSocketEventRequest,
  roomId: string,
  event: string,
  payload: T
): void => {
  try {
    if (!roomId) {
      throw new Error("Room ID is required to emit socket event");
    }
    const io = req.app.get("io");
    if (!io) {
      throw new Error("Socket.io instance not found");
    }
    io.to(roomId).emit(event, payload);
  } catch (error) {
    console.error("Error emitting socket event:", error);
  }
};

export { initializeSocketIO, emitSocketEvent };
