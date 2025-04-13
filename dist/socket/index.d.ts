import type { Server } from "socket.io";
declare const initializeSocketIO: (io: Server) => void;
interface EmitSocketEventRequest {
    app: {
        get: (name: string) => Server;
    };
}
declare const emitSocketEvent: <T>(req: EmitSocketEventRequest, roomId: string, event: string, payload: T) => void;
export { initializeSocketIO, emitSocketEvent };
