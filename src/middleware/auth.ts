import type { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError";
import { verifyJWT } from "../utils/jwt";

export const authenticate = async (
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

    const decoded = await verifyJWT(token);
    if (!decoded) {
      throw new ApiError(401, "Invalid token.");
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    next(error);
  }
};
