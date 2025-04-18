import type { Server } from "socket.io";

import authenticateSocket from "../middleware/authSocket";
import type { CustomSocket } from "../types/Socket";
import { ChatEventEnum } from "../utils/constants";

const initializeSocketIO = (io: Server): void => {
  io.use(authenticateSocket);
  io.engine.on("connection_error", (err) => {
    console.error("Socket connection error:", err);
  });

  // Socket.io connection event
  io.on("connection", async (socket: CustomSocket) => {
    try {
      if (!socket.user) {
        console.error("Unauthorized socket connection attempt");
        return socket.disconnect(true);
      }

      // Socket connection established
      socket.join(socket.user.id);
      socket.emit(ChatEventEnum.CONNECTED_EVENT);
      console.log("User connected. userId:", socket.user.id);

      // Joining a chat room
      socket.on(ChatEventEnum.ONLINE_EVENT, (chatId: string) => {
        console.log(`User joined the chat. chatId:`, chatId);
        socket.join(chatId);
      });

      // Typing events
      socket.on(ChatEventEnum.TYPING_EVENT, (chatId: string) => {
        socket.to(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
      });

      // Stop typing event
      socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId: string) => {
        socket.to(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
      });

      // Disconnect event
      socket.on(ChatEventEnum.DISCONNECT_EVENT, async () => {
        if (socket.user) {
          console.log("User disconnected. userId:", socket.user.id);
          socket.leave(socket.user.id);
        }
      });
    } catch (error) {
      console.error("Socket connection error:", error);
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        (error as Error)?.message || "An error occurred while connecting."
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
  payload: T
): void => {
  try {
    if (!roomId) {
      console.error("Room ID is required to emit socket event");
      return;
    }
    const io = req.app.get("io") as Server;
    if (!io) {
      console.error("Socket.io instance not found");
      return;
    }
    io.to(roomId).emit(event, payload);
  } catch (error) {
    console.error("Error emitting socket event:", error);
  }
};

export { initializeSocketIO, emitSocketEvent };
