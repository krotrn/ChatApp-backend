import type { CustomSocket } from "../../../types/Socket";
import { ChatEventEnum } from "../../../utils/constants";

export class ConnectionHandlers {
  static setupConnectionHandlers(socket: CustomSocket) {
    const userId = socket.user?.id;
    if (!userId) return;

    socket.on("ping", (data: { timestamp: number }, callback) => {
      console.log(
        `Health check ping from user ${userId} on socket ${socket.id} at ${data.timestamp}`,
      );
      if (callback && typeof callback === "function") {
        callback({ timestamp: Date.now(), serverTime: Date.now() });
      }
    });

    socket.on("error", (error) => {
      console.error(`Socket error for user ${userId}:`, error);
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        error?.message || "An error occurred during connection.",
      );
    });
  }

  static handleSocketDisconnection(
    socket: CustomSocket,
    onlineUserIds: Map<string, string>,
  ) {
    const userId = socket.user?.id;
    if (!userId) return;

    onlineUserIds.delete(userId);
    console.log(`User ${userId} disconnected.`);
    socket.leave(userId);
    socket.broadcast.emit(ChatEventEnum.USER_IS_OFFLINE_EVENT, { userId });
  }
}
