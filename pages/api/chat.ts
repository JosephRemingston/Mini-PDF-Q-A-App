import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../lib/db";
import { Conversation } from "../../models/Conversation";
import { getTokenFromReq, verifyToken } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getTokenFromReq(req as any);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  let userId: string;
  try {
    const payload = verifyToken(token) as any;
    userId = payload.sub as string;
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await connectToDatabase();

  if (req.method === "GET") {
    const conv = await Conversation.findOne({ userId }).lean();
    return res.status(200).json({ messages: conv?.messages || [] });
  }

  if (req.method === "POST") {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: "messages must be an array" });
    const conv = await Conversation.findOneAndUpdate(
      { userId },
      { $set: { userId }, $push: { messages: { $each: messages } } },
      { upsert: true, new: true }
    );
    return res.status(200).json({ messages: conv.messages });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}


