"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadErrors = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        return next(new ApiError_1.default(413, `File upload error: ${err.message}`));
    }
    next(err);
};
exports.handleUploadErrors = handleUploadErrors;
//# sourceMappingURL=handleUploadErrors.middleware.js.map