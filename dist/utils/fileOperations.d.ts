import type { Request } from "express";
export declare const removeLocalFile: (localPath: string) => Promise<void>;
export declare const getLocalPath: (fileName: string) => string;
export declare const getStaticFilePath: (req: Request, fileName: string) => string;
