// middlewares/validateRequests.ts

import { Response, NextFunction } from 'express';
import { CreateChatRequest, SendMessageRequest } from '../types/request.type';
import ApiError  from '../utils/ApiError';

/**
 * Middleware to validate the request body for creating a new chat.
 */
export const validateCreateChatRequest = (
  req: CreateChatRequest,
  res: Response,
  next: NextFunction
): void => {
  const { participants, type, createdBy } = req.body;
  
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return next(new ApiError(400, 'Invalid request: "participants" must be a non-empty array'));
  }
  if (!type || (type !== 'direct' && type !== 'group' && type !== 'channel')) {
    return next(new ApiError(400, 'Invalid request: "type" must be either "direct", "group", or "channel"'));
  }
  if (!createdBy) {
    return next(new ApiError(400, 'Invalid request: "createdBy" is required'));
  }
  next();
};

/**
 * Middleware to validate the request body for sending a chat message.
 */
export const validateSendMessageRequest = (
  req: SendMessageRequest,
  res: Response,
  next: NextFunction
): void => {
  const { sender, receiver, chat, content, attachments } = req.body;
  
  if (!sender || !receiver || !chat) {
    return next(new ApiError(400, 'Invalid request: "sender", "receiver", and "chat" are required'));
  }
  // Ensure at least one of content or attachments is provided
  if (!content && (!attachments || attachments.length === 0)) {
    return next(new ApiError(400, 'Invalid request: either "content" or "attachments" must be provided'));
  }
  next();
};
