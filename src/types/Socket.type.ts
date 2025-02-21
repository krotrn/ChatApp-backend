import { Socket } from "socket.io";

export interface CustomSocket extends Socket {
  user?: {
    _id: string;
    [key: string]: unknown;
  };
}