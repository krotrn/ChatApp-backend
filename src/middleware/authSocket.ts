import type { ExtendedError } from "socket.io/dist/namespace";
import type { CustomSocket } from "../types/Socket";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import { validateUser } from "../utils/userHelper";

export default async (
  socket: CustomSocket,
  next: (err?: ExtendedError) => void,
) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!accessTokenSecret) {
      throw new ApiError(500, "Access token secret not configured");
    }

    const decoded = jwt.verify(
      token,
      accessTokenSecret,
    ) as CustomSocket["user"];

    if (!decoded) {
      return next(new Error("Invalid token"));
    }
    const isValid = await validateUser([decoded.id]);
    if (!isValid) return next(new ApiError(403, "Invalid user"));

    socket.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new Error("Invalid token"));
    } else {
      console.error("Socket auth error:", error);
      next(new ApiError(500, "Authentication failed"));
    }
  }
};
