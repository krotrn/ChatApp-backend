import type { ExtendedError } from "socket.io/dist/namespace";
import type { CustomSocket } from "../types/Socket";
import ApiError from "../utils/ApiError";
import { validateUser } from "../utils/userHelper";
import { verifyJWT } from "../utils/jwt";

export default async (
  socket: CustomSocket,
  next: (err?: ExtendedError) => void,
) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(
        new ApiError(400, "Authentication required token is missing."),
      );
    }

    const accessTokenSecret = process.env.JWT_SECRET;
    if (!accessTokenSecret) {
      throw new ApiError(500, "Access token secret not configured");
    }

    const decoded = await verifyJWT(token);

    if (!decoded) {
      return next(new ApiError(400, "Invalid token"));
    }
    const isValid = await validateUser([decoded.id]);
    if (!isValid) return next(new ApiError(403, "Invalid user"));

    socket.user = decoded;
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(
      new ApiError(500, "Internal server error during socket authentication"),
    );
  }
};
