import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { ChatEventEnum } from "../utils/constants";
import { CustomSocket } from "../types/Socket.type";
import redisClient from "../utils/redisClient";
import axios from "axios";

const mountJoinChatEvent = (socket: Socket) => {
  socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId: string) => {
    console.log(`User joined the chat 🤝. chatId: `, chatId);
    socket.join(chatId);
  });
};

const mountParticipantTypingEvent = (socket: Socket) => {
  socket.on(ChatEventEnum.TYPING_EVENT, (chatId: string) => {
    socket.in(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
  });
};

const mountParticipantStoppedTypingEvent = (socket: Socket) => {
  socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId: string) => {
    socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
  });
};

const initializeSocketIO = (io: Server) => {
  const REPO1_API_URL = process.env.REPO1;
  io.use(async (socket: CustomSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const { data: user } = await axios.post(
        `${REPO1_API_URL}/auth/verify-token`,
        { token }
      );

      if (!user) return next(new Error("Unauthorized"));
      if (await redisClient.exists(`conn:${user.id}`)) {
        return next(new Error("Duplicate connection"));
      }

      socket.user = user;
      await redisClient.set(`conn:${user.id}`, "1", { EX: 10 });
      next();
    } catch (error) {
      console.log(error);
      next(new Error("Authentication failed"));
    }
  });
  return io.on("connection", async (socket: CustomSocket) => {
    try {
      const token = socket.handshake.auth.token;

      const decodeToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as {
        _id: string;
        [key: string]: unknown;
      };

      socket.user = { ...decodeToken, _id: decodeToken._id };
      socket.join(socket.user._id);
      socket.emit(ChatEventEnum.CONNECTED_EVENT);
      console.log("User connected 🗼. userId: ", socket.user._id);

      mountJoinChatEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);

      socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
        if (socket.user) {
          console.log("User disconnected 🚫. userId: " + socket.user?._id);
          socket.leave(socket.user._id);
        }
      });
    } catch (error) {
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        (error as Error)?.message ||
          "Something went wrong while connecting to the socket."
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
  req.app.get("io").in(roomId).emit(event, payload);
};

export { initializeSocketIO, emitSocketEvent };
