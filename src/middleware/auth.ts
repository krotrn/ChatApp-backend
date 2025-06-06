import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import { JwtPayload } from "src/types/custom";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.method === "OPTIONS") {
      return next();
    }
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new ApiError(401, "Authentication required token is missing.");
    }
    if (!process.env.JWT_SECRET) {
      throw new ApiError(500, "JWT_SECRET is not defined.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, "Invalid token"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, "Token expired"));
    } else {
      next(error);
    }
  }
};
