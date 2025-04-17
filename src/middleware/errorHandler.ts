import type { ErrorRequestHandler } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
import mongoose from "mongoose";
import { MulterError } from "multer";

import ApiError from "../utils/ApiError";

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next,
) => {
  void next;

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: err.message,
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((error) => error.message);
    res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
    return;
  }

  if (err instanceof MulterError) {
    res.status(400).json({
      success: false,
      message: "File Upload Error",
      error: err.message,
    });
    return;
  }

  if (err.message.includes("Too many requests")) {
    res.status(429).json({
      success: false,
      message: err.message,
    });
    return;
  }

  console.error("Unhandled Error:", err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
