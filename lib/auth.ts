import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { serialize, parse } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";

const JWT_SECRET = process.env.JWT_SECRET || "";
const COOKIE_NAME = "token";

export function signToken(payload: Record<string, unknown>, expiresInSeconds: number = 60 * 60 * 24 * 7) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
  const secret: Secret = JWT_SECRET;
  const options: SignOptions = { expiresIn: expiresInSeconds };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string): JwtPayload {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
  const payload = jwt.verify(token, JWT_SECRET);
  if (typeof payload === "string") throw new Error("Invalid token payload");
  return payload as JwtPayload;
}

export function setAuthCookie(res: NextApiResponse, token: string) {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  res.setHeader("Set-Cookie", cookie);
}

export function clearAuthCookie(res: NextApiResponse) {
  const cookie = serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookie);
}

export function getTokenFromReq(req: NextApiRequest): string | null {
  const header = req.headers.cookie || "";
  const cookies = parse(header || "");
  return cookies[COOKIE_NAME] || null;
}


