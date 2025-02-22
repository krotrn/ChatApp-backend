import { Response, NextFunction } from 'express';
import { CreateChatRequest } from '../types/request.type';
import ApiError  from '../utils/ApiError';

/**
 * Middleware to validate the request body for creating a new chat.
 */
export const validateCreateChatRequest = (
  req: CreateChatRequest,
  res: Response,
  next: NextFunction
): void => {
  const {name, participants} = req.body;
  
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return next(new ApiError(400, 'Invalid request: "participants" must be a non-empty array'));
  }
  if (!name) {
    return next(new ApiError(400, 'Invalid request: "name" is required'));
  }
  next();
};
