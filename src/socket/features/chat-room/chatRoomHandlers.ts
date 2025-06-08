import type { CustomSocket } from "../../../types/Socket";
import { ChatEventEnum } from "../../../utils/constants";

export class ChatRoomHandlers {
  static setupChatRoomHandlers(socket: CustomSocket) {
    const userId = socket.user?.id;
    if (!userId) return;

    socket.on(
      ChatEventEnum.JOIN_CHAT_EVENT,
      async ({ chatId }: { chatId: string }) => {
        socket.join(chatId);
        console.log(`User ${userId} joined chat room ${chatId}`);
      },
    );

    socket.on(ChatEventEnum.LEAVE_CHAT_EVENT, async (chatId: string) => {
      socket.leave(chatId);
      console.log(`User ${userId} left chat room ${chatId}`);
    });
  }
}
