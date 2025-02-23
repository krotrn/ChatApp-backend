import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import { AuthenticatedRequest } from "../types/request.type";

/**
 * Middleware function to authenticate a user based on a JWT token.
 *
 * This middleware attempts to retrieve the JWT token from either the 'accessToken' cookie
 * or the 'Authorization' header (expected in the format "Bearer <token>"). It then verifies the token
 * using the secret specified in the environment variable ACCESS_TOKEN_SECRET. Upon successful verification,
 * it extracts the user ID from the token payload (assumed to be under the property 'id') and attaches it
 * to the request object as 'user'. If the token is missing, invalid, or expired, the middleware passes
 * an ApiError with a 401 status to the next error handler.
 *
 * @param req - The HTTP request object, extended to include an optional 'user' property.
 * @param _res - The HTTP response object (unused in this middleware).
 * @param next - The next middleware function in the Express pipeline.
 *
 * @throws {ApiError} If token verification fails, an ApiError with a 401 status is thrown.
 */
const authenticate: RequestHandler = (req:Request, _res:Response, next:NextFunction) => {
  const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { id: string };
    (req as AuthenticatedRequest).user = { _id: decoded.id };
    next();
  } catch (error) {
    console.log(error)
    next(new ApiError(401, "Invalid or expired token"));
  }
};

export default authenticate;
