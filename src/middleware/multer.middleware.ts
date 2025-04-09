import multer from "multer";
import path from "path";
import ApiError from "../utils/ApiError";
import { Request } from "express";

const generateFilename = (req: Request, file: Express.Multer.File) => {
  const sanitized = file.originalname
    .replace(/[^a-zA-Z0-9\-_.]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const ext = path.extname(sanitized);
  if (!ext) throw new ApiError(400, "File extension missing");

  return `${path.basename(sanitized, ext)}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 15)}${ext}`;
};

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedExtensions = [".jpg", ".png", ".pdf", ".txt"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(new ApiError(400, "Invalid file extension"));
  }
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "text/plain",
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new ApiError(400, "Invalid file type"));
  }
  cb(null, true);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(process.cwd(), "public/images"));
  },
  filename: (req, file, cb) => {
    try {
      const filename = generateFilename(req, file);
      cb(null, filename);
    } catch (error) {
      console.log(error);
      cb(error as Error, "");
    }
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter,
  preservePath: false,
});
