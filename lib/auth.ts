import jwt from "jsonwebtoken";
import { serialize, parse } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "";
const COOKIE_NAME = "token";

export function signToken(payload: object, expiresIn = "7d") {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
  return jwt.verify(token, JWT_SECRET) as any;
}

export function setAuthCookie(res: any, token: string) {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  res.setHeader("Set-Cookie", cookie);
}

export function clearAuthCookie(res: any) {
  const cookie = serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookie);
}

export function getTokenFromReq(req: any): string | null {
  const header = req.headers.cookie || "";
  const cookies = parse(header || "");
  return cookies[COOKIE_NAME] || null;
}


