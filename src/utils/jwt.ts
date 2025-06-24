import { JwtPayload } from "../types/custom";

export async function verifyJWT(token: string): Promise<JwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { jwtVerify } = await import('jose');

    const { payload } = (await jwtVerify(token, secret)) as {
      payload: JwtPayload;
    };
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
