import { Chroma } from "@langchain/community/vectorstores/chroma";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RetrievalQAChain } from "langchain/chains";
import { getExistingMemoryStore, loadHnswIfExists } from "../../lib/vectorStore";
import { getTokenFromReq, verifyToken } from "../../lib/auth";
import { connectToDatabase } from "../../lib/db";
import { Conversation } from "../../models/Conversation";
import { CloudClient } from "chromadb";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";

function assertApiKey(req) {
  const headerKey = req.headers["x-api-key"]; 
  const provided = Array.isArray(headerKey) ? headerKey[0] : headerKey;
  if (!process.env.NEXT_PUBLIC_API_KEY || provided !== process.env.NEXT_PUBLIC_API_KEY) {
    const e = new Error("Unauthorized");
    e.statusCode = 401;
    throw e;
  }
}

export default async function handler(req, res) {
  try {
    assertApiKey(req);
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { question, history } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Missing question" });
    }

    let vectorStore;
    const { CHROMA_URL, CHROMA_CLOUD_API_KEY, CHROMA_TENANT, CHROMA_DATABASE } = process.env;
    try {
      if (CHROMA_CLOUD_API_KEY && CHROMA_TENANT && CHROMA_DATABASE) {
        const index = new CloudClient({ apiKey: CHROMA_CLOUD_API_KEY, tenant: CHROMA_TENANT, database: CHROMA_DATABASE });
        vectorStore = await Chroma.fromExistingCollection(new GoogleGenerativeAIEmbeddings({ model: "text-embedding-004", apiKey: process.env.GOOGLE_API_KEY }), {
          collectionName: "pdf-qa",
          index,
        });
      } 
      else if (CHROMA_URL) {
        vectorStore = await Chroma.fromExistingCollection(new GoogleGenerativeAIEmbeddings({ model: "text-embedding-004", apiKey: process.env.GOOGLE_API_KEY }), {
          collectionName: "pdf-qa"
        });
      } else {
        vectorStore = getExistingMemoryStore();
        if (!vectorStore) {
          const embeddings = new GoogleGenerativeAIEmbeddings({ model: "text-embedding-004", apiKey: process.env.GOOGLE_API_KEY });
          const hnsw = await loadHnswIfExists(embeddings);
          if (hnsw) {
            vectorStore = hnsw;
          } else {
            return res.status(400).json({ error: "No index loaded. Upload a PDF first." });
          }
        }
      }
    } catch (e) {
      vectorStore = getExistingMemoryStore();
      if (!vectorStore) {
        const embeddings = new GoogleGenerativeAIEmbeddings({ model: "text-embedding-004", apiKey: process.env.GOOGLE_API_KEY });
        const hnsw = await loadHnswIfExists(embeddings);
        if (hnsw) {
          vectorStore = hnsw;
        } else {
          return res.status(400).json({ error: "Chroma unreachable and no local index. Upload a PDF first." });
        }
      }
    }

    const retriever = vectorStore.asRetriever({ k: 4 });
    const model = new ChatGoogleGenerativeAI({ modelName: "gemini-1.5-flash", temperature: 0, apiKey: process.env.GOOGLE_API_KEY });
    const chain = RetrievalQAChain.fromLLM(model, retriever);
    const chatPrefix = Array.isArray(history) && history.length
      ? `Conversation so far:\n${history.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nUser question:`
      : undefined;
    const result = await chain.call({ query: chatPrefix ? `${chatPrefix} ${question}` : question });
    const answer = result?.text || result?.output_text || "";
    // persist chat if user is authenticated
    try {
      const token = getTokenFromReq(req);
      if (token) {
        const payload = verifyToken(token);
        await connectToDatabase();
        const upserts = [];
        if (Array.isArray(history) && history.length) {
          upserts.push(...history);
        } else {
          upserts.push({ role: "user", content: question });
        }
        upserts.push({ role: "assistant", content: answer });
        await Conversation.findOneAndUpdate(
          { userId: payload.sub },
          { $set: { userId: payload.sub }, $push: { messages: { $each: upserts } } },
          { upsert: true }
        );
      }
    } catch {}
    return res.status(200).json({ answer });
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({ error: error?.message || "Internal Server Error" });
  }
}


