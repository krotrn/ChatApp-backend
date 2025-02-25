import jwt from "jsonwebtoken";
import { DecodedToken } from "../types/decodedToken.type";
import { CustomSocket } from "../types/Socket.type";
import ApiError from "../utils/ApiError";

import { validateUser } from "../utils/userHelper";

const authenticateSocket = async (socket: CustomSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new ApiError(403,"Authentication token missing"));

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as DecodedToken;
    
    const isValid = await validateUser(decoded.id);
    if (!isValid) return next(new ApiError(403,"Invalid user"));

    socket.user = decoded;
    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    next(new ApiError(500,"Authentication failed"));
  }
};

export default authenticateSocket;