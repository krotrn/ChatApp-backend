import jwt from "jsonwebtoken";
import type { NextFunction } from "express";
import type { CustomSocket } from "@/types/Socket.type";
import type { DecodedToken } from "@/types/decodedToken.type";
import ApiError from "@/utils/ApiError";
import { validateUser } from "@/utils/userHelper";

const authenticateSocket = async (
  socket: CustomSocket,
  next: NextFunction
): Promise<void> => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new ApiError(403, "Authentication token missing"));

    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!accessTokenSecret) {
      throw new ApiError(500, "Access token secret not configured");
    }

    const decoded = jwt.verify(token, accessTokenSecret) as DecodedToken;

    const isValid = await validateUser(decoded.id);
    if (!isValid) return next(new ApiError(403, "Invalid user"));

    socket.user = decoded;
    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    next(new ApiError(500, "Authentication failed"));
  }
};

export default authenticateSocket;
