"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const generateFilename = (req, file) => {
    const sanitized = file.originalname
        .replace(/[^a-zA-Z0-9\-_.]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
    const ext = path_1.default.extname(sanitized);
    if (!ext)
        throw new ApiError_1.default(400, "File extension missing");
    return `${path_1.default.basename(sanitized, ext)}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}${ext}`;
};
const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".jpg", ".png", ".pdf", ".txt"];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return cb(new ApiError_1.default(400, "Invalid file extension"));
    }
    const allowedMimes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
        "text/plain",
    ];
    if (!allowedMimes.includes(file.mimetype)) {
        return cb(new ApiError_1.default(400, "Invalid file type"));
    }
    cb(null, true);
};
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.resolve(process.cwd(), "public/images"));
    },
    filename: (req, file, cb) => {
        try {
            const filename = generateFilename(req, file);
            cb(null, filename);
        }
        catch (error) {
            console.log(error);
            cb(error, "");
        }
    },
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
    },
    fileFilter,
    preservePath: false,
});
//# sourceMappingURL=multer.js.map