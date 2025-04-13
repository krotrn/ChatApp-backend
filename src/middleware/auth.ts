import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import type { DecodedToken } from "../types/decodedToken";

interface JwtPayload {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  username: string;
  role: string;
  exp: number;
  iat: number;
}

declare module "express" {
  interface Request {
    user?: DecodedToken;
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new ApiError(401, "Authentication required");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      throw new jwt.TokenExpiredError(
        "Token expired",
        new Date(decoded.exp * 1000),
      );
    }

    console.log(decoded);
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
