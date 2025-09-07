import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../lib/db";
import { Conversation } from "../../models/Conversation";
import { getTokenFromReq, verifyToken } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  let userId: string;
  try {
    const payload = verifyToken(token);
    userId = String(payload.sub);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await connectToDatabase();

  // GET list conversations or one conversation by id
  if (req.method === "GET") {
    const { id } = req.query as { id?: string };
    if (id) {
      const conv = await Conversation.findOne({ _id: id, userId }).lean();
      if (!conv) return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ conversation: conv });
    }
    const list = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .select("title updatedAt messages")
      .slice("messages", 1)
      .lean();
    const conversations = list.map((c: { _id: any; title: string; updatedAt: Date; messages?: { content: string }[] }) => ({
      _id: c._id,
      title: c.title,
      updatedAt: c.updatedAt,
      preview: c.title && c.title !== "New Chat" ? c.title : (c.messages?.[0]?.content || "Untitled")?.slice(0, 60),
    }));
    return res.status(200).json({ conversations });
  }

  // POST create or append
  if (req.method === "POST") {
    const { id, title, messages } = req.body || {};
    if (id) {
      if (!Array.isArray(messages)) return res.status(400).json({ error: "messages must be an array" });
      const conv = await Conversation.findOneAndUpdate(
        { _id: id, userId },
        { $push: { messages: { $each: messages } } },
        { new: true }
      );
      if (!conv) return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ conversation: conv });
    } else {
      const conv = await Conversation.create({ userId, title: title || "New Chat", messages: Array.isArray(messages) ? messages : [] });
      return res.status(201).json({ conversation: conv });
    }
  }

  // PUT rename
  if (req.method === "PUT") {
    const { id, title } = req.body || {};
    if (!id || !title) return res.status(400).json({ error: "id and title required" });
    const conv = await Conversation.findOneAndUpdate({ _id: id, userId }, { $set: { title } }, { new: true });
    if (!conv) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ conversation: conv });
  }

  // DELETE conversation
  if (req.method === "DELETE") {
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).json({ error: "id required" });
    await Conversation.deleteOne({ _id: id, userId });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}


