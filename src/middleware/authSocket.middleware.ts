import jwt from "jsonwebtoken";
import { DecodedToken } from "../types/decodedToken.type";
import { CustomSocket } from "../types/Socket.type";
import ApiError from "../utils/ApiError";

const authenticateSocket = async (
  socket: CustomSocket,
  next: (err?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new ApiError(401, "Authentication token is missing"));
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as DecodedToken;

    if (!decoded) {
      return next(new ApiError(403, "Invalid authentication token"));
    }

    socket.user = decoded;
    next();
  } catch (error) {
    console.log("Socket authentication error:", error);

    if ((error as Error).name === "TokenExpiredError") {
      return next(new ApiError(401, "Token has expired"));
    } else if ((error as Error).name === "JsonWebTokenError") {
      return next(new ApiError(403, "Invalid token"));
    }

    return next(new ApiError(402, "Authentication failed"));
  }
};

export default authenticateSocket;
