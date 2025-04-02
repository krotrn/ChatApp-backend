import { Server } from "socket.io";
import { ChatEventEnum } from "../utils/constants";
import { CustomSocket } from "../types/Socket.type";
import authenticateSocket from "../middleware/authSocket.middleware";
import redisClient from "../utils/redis";


const initializeSocketIO = (io: Server) => {
  io.use(authenticateSocket);

  return io.on("connection", async (socket: CustomSocket) => {
    try {
      if (!socket.user) {
        console.error("Unauthorized socket connection attempt");
        return socket.disconnect(true);
      }

      socket.join(socket.user.id);
      await redisClient.set(`conn:${socket.user.id}`, "connected");

      socket.emit(ChatEventEnum.CONNECTED_EVENT);
      console.log("User connected 🗼. userId:", socket.user.id);

      // Joining a chat room
      socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId: string) => {
        console.log(`User joined the chat 🤝. chatId:`, chatId);
        socket.join(chatId);
      });

      // Typing events
      socket.on(ChatEventEnum.TYPING_EVENT, (chatId: string) => {
        socket.to(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
      });

      socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId: string) => {
        socket.to(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
      });

      socket.on(ChatEventEnum.DISCONNECT_EVENT, async () => {
        if (socket.user) {
          await redisClient.del(`conn:${socket.user.id}`);
          console.log("User disconnected 🚫. userId:", socket.user.id);
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

const emitSocketEvent = (
  req: EmitSocketEventRequest,
  roomId: string,
  event: string,
  payload: unknown
) => {
  req.app.get("io").to(roomId).emit(event, payload);
};

export { initializeSocketIO, emitSocketEvent };
