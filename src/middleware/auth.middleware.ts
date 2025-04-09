import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "@/utils/ApiError";
import { DecodedToken } from "@/types";

interface JwtPayload {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  username: string;
  role: string;
}

declare module "express" {
  interface Request {
    user?: DecodedToken;
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new ApiError(401, "Authentication required");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, "Invalid token"));
    } else {
      next(error);
    }
  }
};
