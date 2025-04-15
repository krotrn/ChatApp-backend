import type { Request, Response, NextFunction } from "express";
import type { DecodedToken } from "../types/decodedToken";
declare module "express" {
    interface Request {
        user?: DecodedToken;
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
