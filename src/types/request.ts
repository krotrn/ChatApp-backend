import type { Request } from "express";
import type { ChatParticipant } from "./chat";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    name: string;
    avatarUrl: string;
    email: string;
    username: string;
    role: string;
  };
}

export type CreateChatRequest = AuthenticatedRequest & {
  body: {
    name?: string;
    participants: ChatParticipant[];
    admin?: string;
    avatarUrl?: string;
    type: "direct" | "group" | "channel";
    createdBy: string;
  };
};
