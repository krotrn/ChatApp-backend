import type { CustomSocket } from "../../../types/Socket";
import { ChatEventEnum } from "../../../utils/constants";

export class TypingHandlers {
  static setupTypingHandlers(socket: CustomSocket) {
    const userId = socket.user?.id;
    if (!userId) return;

    socket.on(
      ChatEventEnum.TYPING_EVENT,
      (data: { userId: string; chatId: string }) => {
        console.log(`User ${userId} is typing in chat ${data.chatId}`);
        socket.to(data.chatId).emit(ChatEventEnum.TYPING_EVENT, {
          userId,
          chatId: data.chatId,
        });
      },
    );

    socket.on(
      ChatEventEnum.STOP_TYPING_EVENT,
      (data: { userId: string; chatId: string }) => {
        console.log(`User ${userId} stopped typing in chat ${data.chatId}`);
        socket.to(data.chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, {
          userId,
          chatId: data.chatId,
        });
      },
    );
  }
}
