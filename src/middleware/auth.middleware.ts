import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import { AuthenticatedRequest } from "../types/request.type";

const authenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token =
    req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      id: string;
      name: string;
      avatarUrl: string;
      email: string;
      username: string;
      role: string;
    };
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    console.log(error);
    next(new ApiError(401, "Invalid or expired token"));
  }
};

export default authenticate;
