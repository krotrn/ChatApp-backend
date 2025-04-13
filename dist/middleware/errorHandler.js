"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = require("multer");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const errorHandler = (err, req, res, next) => {
    void next;
    if (err instanceof ApiError_1.default) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
        });
        return;
    }
    if (err instanceof jsonwebtoken_1.JsonWebTokenError) {
        res.status(401).json({
            success: false,
            message: "Invalid or expired token",
            error: err.message,
        });
        return;
    }
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        const errors = Object.values(err.errors).map((error) => error.message);
        res.status(400).json({
            success: false,
            message: "Validation Error",
            errors,
        });
        return;
    }
    if (err instanceof multer_1.MulterError) {
        res.status(400).json({
            success: false,
            message: "File Upload Error",
            error: err.message,
        });
        return;
    }
    if (err.message.includes("Too many requests")) {
        res.status(429).json({
            success: false,
            message: err.message,
        });
        return;
    }
    console.error("Unhandled Error:", err);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map