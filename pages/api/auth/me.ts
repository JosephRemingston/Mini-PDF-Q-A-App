import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../../lib/db";
import { User } from "../../../models/User";
import { getTokenFromReq, verifyToken } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = verifyToken(token);
    await connectToDatabase();
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    return res.status(200).json({ id: user._id, email: user.email });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}


