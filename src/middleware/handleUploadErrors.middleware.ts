import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import ApiError from "@/utils/ApiError";

export const handleUploadErrors = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    return next(new ApiError(413, `File upload error: ${err.message}`));
  }
  next(err);
};
