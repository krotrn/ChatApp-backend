import type { ErrorRequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import mongoose from "mongoose";
import { MulterError } from "multer";

import ApiError from "../utils/ApiError";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  void next;
  const errorDetails = {
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    errorMessage: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  };

  if (err instanceof ApiError) {
    console.error(`[API Error] ${err.statusCode} - ${err.message}`, err.errors);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof TokenExpiredError) {
    res.status(401).json({
      success: false,
      message: "Your session has expired, please login again",
      error: "token_expired",
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      success: false,
      message: "Invalid authentication token",
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

  if (err instanceof mongoose.Error.CastError) {
    // Invalid MongoDB ID format
    console.error("Mongoose Cast Error:", errorDetails);
    res.status(400).json({
      success: false,
      message: "Invalid ID format",
      error: err.message,
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

  if (err.code === 11000) {
    console.error("MongoDB Duplicate Key Error:", {
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString(),
      errorMessage: err.message,
    });
    const field = Object.keys(err.keyValue)[0];
    res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
      error: `${field} already exists`,
    });
    return;
  }

  if (err.message.includes("Too many requests")) {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
      error: err.message,
    });
    return;
  }

  console.error("Unhandled Error:", errorDetails);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};