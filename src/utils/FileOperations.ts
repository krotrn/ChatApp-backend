import { Request } from "express";
import fs from "fs";
import path from "path";
export const removeLocalFile = (localPath: string) => {
  return new Promise((resolve, reject) => {
    fs.unlink(localPath, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
};


/**
 *
 * @param {string} fileName
 * @description returns the file's local path in the file system to assist future removal
 */
export const getLocalPath = (fileName: string) => {
  // Sanitize filename to prevent path traversal
  const sanitized = fileName.replace(/[^a-zA-Z0-9\-_.]/g, '');
  return path.join(process.cwd(), 'public', 'images', sanitized);
};


/**
 *
 * @param {import("express").Request} req
 * @param {string} fileName
 * @description returns the file's static path from where the server is serving the static image
 */
export const getStaticFilePath = (req: Request, fileName: string) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host')?.replace(/:\d+$/, ''); 
  if (!/^[\w-]+\.[a-z]{3,4}$/i.test(fileName)) {
    throw new Error('Invalid filename format');
  }
  return `${protocol}://${host}/images/${fileName}`;
};

