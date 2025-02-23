import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { ChatParticipant } from "./Chat.type";


export interface AuthenticatedRequest<
  TBody = unknown,
  TParams extends ParamsDictionary = ParamsDictionary,
  TQuery = ParsedQs
> extends Request<TParams, unknown, TBody, TQuery> {
  user: {
    _id: string;
  };
}

export type CreateChatRequest = AuthenticatedRequest<{
  name?: string;
  participants: ChatParticipant[];
  admin?: string;
  type: "direct" | "group" | "channel";
  createdBy: string;
}>;
