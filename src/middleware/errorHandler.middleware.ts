// src/middleware/errorHandler.middleware.ts
import { ErrorRequestHandler } from "express";
import ApiError from "../utils/ApiError";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req, 
  res,
  next
) => {
  void next;
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
    return;
  }

  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
};