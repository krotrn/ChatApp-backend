"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploadRateLimiter = exports.chatCreationRateLimiter = exports.messageRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const request_ip_1 = __importDefault(require("request-ip"));
exports.messageRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => request_ip_1.default.getClientIp(req) || "unknown",
    message: "Too many messages sent, please try again later",
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many messages sent, please try again later",
        });
    },
});
exports.chatCreationRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 chat creations per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => request_ip_1.default.getClientIp(req) || "unknown",
    message: "Too many chat creations, please try again later",
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many chat creations, please try again later",
        });
    },
});
exports.fileUploadRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => request_ip_1.default.getClientIp(req) || "unknown",
    message: "Too many file uploads, please try again later",
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many file uploads, please try again later",
        });
    },
});
//# sourceMappingURL=rateLimit.middleware.js.map