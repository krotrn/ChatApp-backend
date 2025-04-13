import type { ExtendedError } from "socket.io/dist/namespace";
import type { CustomSocket } from "../types/Socket";
declare const _default: (socket: CustomSocket, next: (err?: ExtendedError) => void) => Promise<void>;
export default _default;
