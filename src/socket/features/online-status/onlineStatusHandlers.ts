import type { CustomSocket } from "../../../types/Socket";
import { ChatEventEnum } from "../../../utils/constants";

export class OnlineStatusHandlers {
  static setupOnlineStatusHandlers(
    socket: CustomSocket,
    onlineUserIds: Map<string, string>,
  ) {
    const userId = socket.user?.id;
    if (!userId) return;
    socket.join(userId);
    console.log(`User ${userId} connected and joined room ${userId}`);

    const currentOnlineUserIds = Array.from(onlineUserIds.keys());
    socket.emit(ChatEventEnum.ONLINE_USERS_LIST_EVENT, {
      onlineUserIds: currentOnlineUserIds,
    });

    socket.on(ChatEventEnum.USER_ONLINE_EVENT, async () => {
      onlineUserIds.set(userId, socket.id);
      console.log(`User ${userId} is online.`);
      socket.broadcast.emit(ChatEventEnum.USER_IS_ONLINE_EVENT, { userId });
    });
  }

  static handleUserDisconnection(
    socket: CustomSocket,
    onlineUserIds: Map<string, string>,
  ) {
    const userId = socket.user?.id;
    if (!userId) return;

    onlineUserIds.delete(userId);
    socket.broadcast.emit(ChatEventEnum.USER_IS_OFFLINE_EVENT, { userId });
    console.log(`User ${userId} went offline.`);
  }
}
