import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

// Generic interface for authenticated requests
export interface AuthenticatedRequest<
  TBody = unknown,
  TParams extends ParamsDictionary = ParamsDictionary,
  TQuery = ParsedQs
> extends Request<TParams, unknown, TBody, TQuery> {
  user: {
    _id: string;
  };
}

// Use type aliases for endpoint-specific requests
export type CreateChatRequest = AuthenticatedRequest<{
  name?: string;
  participants: string[];
  admin?: string;
  type: "direct" | "group" | "channel";
  createdBy: string;
}>;

export type SendMessageRequest = AuthenticatedRequest<{
  sender: string;
  receiver: string;
  chat: string;
  content: string;
  attachments?: Array<{
    url: string;
    localPath: string;
  }>;
}>;
