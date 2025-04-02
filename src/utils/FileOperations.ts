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


export const getLocalPath = (fileName: string) => {
  const sanitized = fileName.replace(/[^a-zA-Z0-9\-_.]/g, '');
  return path.join(process.cwd(), 'public', 'images', sanitized);
};


export const getStaticFilePath = (req: Request, fileName: string) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host')?.replace(/:\d+$/, ''); 
  if (!/^[\w-]+\.[a-z]{3,4}$/i.test(fileName)) {
    throw new Error('Invalid filename format');
  }
  return `${protocol}://${host}/images/${fileName}`;
};

