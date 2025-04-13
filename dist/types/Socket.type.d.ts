import type { Socket } from 'socket.io';
export interface CustomSocket extends Socket {
    user?: {
        id: string;
        name: string;
        avatarUrl: string;
        email: string;
        username: string;
        role: string;
    };
}
