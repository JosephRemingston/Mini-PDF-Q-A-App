import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../../../lib/db";
import { User } from "../../../models/User";
import { signToken, setAuthCookie } from "../../../lib/auth";
import { Types } from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });
  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const userId = (user._id as Types.ObjectId).toString();
  const token = signToken({ sub: userId, email: user.email });
  setAuthCookie(res, token);
  return res.status(200).json({ id: user._id, email: user.email });
}


