import type { Server } from "socket.io";

import authenticateSocket from "../middleware/authSocket";
import type { CustomSocket } from "../types/Socket";
import { ChatEventEnum } from "../utils/constants";

const initializeSocketIO = (io: Server): void => {
  io.use(authenticateSocket);

  io.engine.on("connection_error", (err) => {
    console.error("Socket connection error:", err);
  });

  io.on("connection", async (socket: CustomSocket) => {
    try {
      if (!socket.user?.id) {
        console.error("Unauthorized socket connection attempt");
        return socket.disconnect(true);
      }

      // Join user's own ID room and the chat room immediately if chatId is available
      socket.join(socket.user.id);
      const chatId = socket.handshake.query.chatId as string; // Assuming chatId is passed in query
      if (chatId) {
        socket.join(chatId);
        console.log(
          `User joined chat on connection. chatId: ${chatId}, userId: ${socket.user.id}`,
        );
      }

      socket.emit(ChatEventEnum.CONNECTED_EVENT);
      console.log("User connected. userId:", socket.user.id);

      // Joining a chat room
      socket.on(
        ChatEventEnum.ONLINE_EVENT,
        (
          chatId: string,
          callback?: (response: { success: boolean; error?: string }) => void,
        ) => {
          try {
            if (!chatId) throw new Error("Chat ID is required");
            socket.join(chatId);
            console.log(
              `User joined the chat. chatId: ${chatId}, userId: ${socket.user?.id}`,
            );
            if (callback) callback({ success: true });
          } catch (error) {
            console.error("Error in ONLINE_EVENT:", error);
            if (callback)
              callback({ success: false, error: (error as Error).message });
          }
        },
      );

      // Typing events
      socket.on(
        ChatEventEnum.TYPING_EVENT,
        (
          chatId: string,
          callback?: (response: { success: boolean; error?: string }) => void,
        ) => {
          try {
            if (!chatId) throw new Error("Chat ID is required");
            socket.to(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
            if (callback) callback({ success: true });
          } catch (error) {
            console.error("Error in TYPING_EVENT:", error);
            if (callback)
              callback({ success: false, error: (error as Error).message });
          }
        },
      );

      // Stop typing event
      socket.on(
        ChatEventEnum.STOP_TYPING_EVENT,
        (
          chatId: string,
          callback?: (response: { success: boolean; error?: string }) => void,
        ) => {
          try {
            if (!chatId) throw new Error("Chat ID is required");
            socket.to(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
            if (callback) callback({ success: true });
          } catch (error) {
            console.error("Error in STOP_TYPING_EVENT:", error);
            if (callback)
              callback({ success: false, error: (error as Error).message });
          }
        },
      );

      // Disconnect event
      socket.on(ChatEventEnum.DISCONNECT_EVENT, async () => {
        try {
          if (socket.user) {
            console.log("User disconnected. userId:", socket.user.id);
            socket.leave(socket.user.id);
          }
        } catch (error) {
          console.error("Error in DISCONNECT_EVENT:", error);
        }
      });
    } catch (error) {
      console.error("Socket connection error:", error);
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        (error as Error)?.message || "An error occurred while connecting.",
      );
    }
  });
};

interface EmitSocketEventRequest {
  app: {
    get: (name: string) => Server;
  };
}

const emitSocketEvent = <T>(
  req: EmitSocketEventRequest,
  roomId: string,
  event: string,
  payload: T,
): void => {
  try {
    if (!roomId) {
      throw new Error("Room ID is required to emit socket event");
    }
    const io = req.app.get("io") as Server;
    if (!io) {
      throw new Error("Socket.io instance not found");
    }
    io.to(roomId).emit(event, payload);
  } catch (error) {
    console.error("Error emitting socket event:", error);
  }
};

export { initializeSocketIO, emitSocketEvent };
