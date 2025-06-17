import type { Server } from "socket.io";
import authSocket from "../middleware/authSocket";
import type { CustomSocket } from "../types/Socket";
import { ChatEventEnum } from "../utils/constants";
import {
  ConnectionHandlers,
  OnlineStatusHandlers,
  TypingHandlers,
  ChatRoomHandlers,
} from "./features";

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

      OnlineStatusHandlers.setupOnlineStatusHandlers(socket, onlineUserIds);
      ConnectionHandlers.setupConnectionHandlers(socket);
      TypingHandlers.setupTypingHandlers(socket);
      ChatRoomHandlers.setupChatRoomHandlers(socket);
      socket.on("disconnect", () => {
        ConnectionHandlers.handleSocketDisconnection(socket, onlineUserIds);
        OnlineStatusHandlers.handleUserDisconnection(socket, onlineUserIds);
      });
    } catch (error) {
      console.error("Socket connection error:", error);
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        (error as Error)?.message || "An error occurred during connection.",
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
  payload: T,
): void => {
  try {
    if (!roomId) {
      throw new Error("Room ID is required to emit socket event");
    }
    const io = req.app.get("io");
    if (!io) {
      throw new Error("Socket.io instance not found");
    }
    console.log(`Emitting event "${event}" to room "${roomId}":`);
    io.to(roomId).emit(event, payload);
  } catch (error) {
    console.error("Error emitting socket event:", error);
  }
};

export { initializeSocketIO, emitSocketEvent };
