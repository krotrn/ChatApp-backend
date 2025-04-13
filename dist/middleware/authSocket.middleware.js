"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const userHelper_1 = require("../utils/userHelper");
exports.default = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication required"));
        }
        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
        if (!accessTokenSecret) {
            throw new ApiError_1.default(500, "Access token secret not configured");
        }
        const decoded = jsonwebtoken_1.default.verify(token, accessTokenSecret);
        if (!decoded) {
            return next(new Error("Invalid token"));
        }
        const isValid = await (0, userHelper_1.validateUser)([decoded.id]);
        if (!isValid)
            return next(new ApiError_1.default(403, "Invalid user"));
        socket.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new Error("Invalid token"));
        }
        else {
            console.error("Socket auth error:", error);
            next(new ApiError_1.default(500, "Authentication failed"));
        }
    }
};
//# sourceMappingURL=authSocket.middleware.js.map