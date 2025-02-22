import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import "../types/express";
import { AuthenticatedRequest } from "../types/request.type";

const authenticate: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new ApiError(401, "Unauthorized: Token is missing"));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as { _id: string };
    // Cast req to AuthenticatedRequest to assign the user property
    (req as AuthenticatedRequest).user = { _id: decoded._id };
    next();
  } catch (error) {
    console.log(error);
    return next(new ApiError(401, "Unauthorized: Invalid token"));
  }
};

export default authenticate;
