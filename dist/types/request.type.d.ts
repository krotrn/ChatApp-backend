import type { Request } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import type { ChatParticipant } from "./chat.type";
export interface AuthenticatedRequest<TBody = unknown, TParams extends ParamsDictionary = ParamsDictionary, TQuery = ParsedQs> extends Request<TParams, unknown, TBody, TQuery> {
    user: {
        id: string;
        name: string;
        avatarUrl: string;
        email: string;
        username: string;
        role: string;
    };
}
export type CreateChatRequest = AuthenticatedRequest<{
    name?: string;
    participants: ChatParticipant[];
    admin?: string;
    type: "direct" | "group" | "channel";
    createdBy: string;
}>;
