import type { Request, Response, NextFunction } from "express";
import { DecodedToken } from "../types";
declare module "express" {
    interface Request {
        user?: DecodedToken;
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
