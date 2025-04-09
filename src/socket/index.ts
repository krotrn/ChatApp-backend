import type { Server } from 'socket.io';

import authenticateSocket from '@/middleware/authSocket.middleware';
import type { CustomSocket } from '@/types/Socket.type';
import { ChatEventEnum } from '@/utils/constants';

const initializeSocketIO = (io: Server): void => {
  io.use(authenticateSocket);

  io.on('connection', async (socket: CustomSocket) => {
    try {
      if (!socket.user) {
        console.error('Unauthorized socket connection attempt');
        return socket.disconnect(true);
      }

      socket.join(socket.user.id);
      socket.emit(ChatEventEnum.CONNECTED_EVENT);
      console.error('User connected. userId:', socket.user.id);

      // Joining a chat room
      socket.on(ChatEventEnum.ONLINE_EVENT, (chatId: string) => {
        console.error(`User joined the chat. chatId:`, chatId);
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
          console.error('User disconnected. userId:', socket.user.id);
          socket.leave(socket.user.id);
        }
      });
    } catch (error) {
      console.error('Socket connection error:', error);
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        (error as Error)?.message || 'An error occurred while connecting.'
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
  const io = req.app.get('io') as Server;
  if (!io) {
    console.error('Socket.io instance not found');
    return;
  }
  io.to(roomId).emit(event, payload);
};

export { initializeSocketIO, emitSocketEvent };
