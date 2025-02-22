import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

// Base authenticated request
export interface AuthenticatedRequest<
  TBody = unknown,
  TParams extends ParamsDictionary = ParamsDictionary,
  TQuery = ParsedQs
> extends Request<TParams, unknown, TBody, TQuery> {
  user: {
    _id: string;
  };
}

// For endpoints that expect a structured body (e.g., JSON data)
export type CreateChatRequest = AuthenticatedRequest<{
  name?: string;
  participants: string[];
  admin?: string;
  type: "direct" | "group" | "channel";
  createdBy: string;
}>;
