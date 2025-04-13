"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            throw new ApiError_1.default(401, "Authentication required");
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
            throw new jsonwebtoken_1.default.TokenExpiredError("Token expired", new Date(decoded.exp * 1000));
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error("Auth error:", error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new ApiError_1.default(401, "Invalid token"));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new ApiError_1.default(401, "Token expired"));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.js.map