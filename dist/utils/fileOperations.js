"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticFilePath = exports.getLocalPath = exports.removeLocalFile = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const removeLocalFile = async (localPath) => {
    await promises_1.default.unlink(localPath);
};
exports.removeLocalFile = removeLocalFile;
const getLocalPath = (fileName) => {
    const sanitized = fileName.replace(/[^a-zA-Z0-9\-_.]/g, "");
    return path_1.default.join(process.cwd(), "public", "images", sanitized);
};
exports.getLocalPath = getLocalPath;
const getStaticFilePath = (req, fileName) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host")?.replace(/:\d+$/, "");
    if (!/^[\w-]+\.[a-z]{3,4}$/i.test(fileName)) {
        throw new Error("Invalid filename format");
    }
    return `${protocol}://${host}/images/${fileName}`;
};
exports.getStaticFilePath = getStaticFilePath;
//# sourceMappingURL=fileOperations.js.map