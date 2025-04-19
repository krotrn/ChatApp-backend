export interface JwtPayload {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  username: string;
  role: string;
  exp: number;
  iat: number;
}
declare module "express" {
  interface Request {
    user?: JwtPayload;
  }
}
