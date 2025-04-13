import fs from "fs/promises";
import path from "path";

import type { Request } from "express";

export const removeLocalFile = async (localPath: string): Promise<void> => {
  await fs.unlink(localPath);
};

export const getLocalPath = (fileName: string): string => {
  const sanitized = fileName.replace(/[^a-zA-Z0-9\-_.]/g, "");
  return path.join(process.cwd(), "public", "images", sanitized);
};

export const getStaticFilePath = (req: Request, fileName: string): string => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host")?.replace(/:\d+$/, "");
  if (!/^[\w-]+\.[a-z]{3,4}$/i.test(fileName)) {
    throw new Error("Invalid filename format");
  }
  return `${protocol}://${host}/images/${fileName}`;
};
