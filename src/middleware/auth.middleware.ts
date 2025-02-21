
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import  ApiError  from '../utils/ApiError';
import '../types/express'; 
import { AuthenticatedRequest } from '../types/request.type';

/**
 * Middleware to authenticate incoming requests.
 * It extracts the JWT from the Authorization header (or cookies) and attaches the decoded user to req.user.
 */
const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  
  if (!token) {
    return next(new ApiError(401, 'Unauthorized: Token is missing'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as { _id: string };
    // Attach the user object to the request (ensuring compatibility with your AuthenticatedRequest interface)
    req.user = { _id: decoded._id as string };
    next();
  } catch (error) {
    console.log(error)
    return next(new ApiError(401, 'Unauthorized: Invalid token'));
  }
};


export default authenticate;