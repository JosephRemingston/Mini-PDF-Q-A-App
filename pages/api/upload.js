import formidable from "formidable";
import fs from "fs";
import os from "os";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { CloudClient } from "chromadb";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { upsertMemoryFromDocuments, saveHnswFromDocuments } from "../../lib/vectorStore";

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "20mb",
  },
};

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";

async function parseForm(req) {
  const uploadDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "upload-"));
  const form = formidable({ multiples: false, uploadDir, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, _fields, files) => {
      if (err) return reject(err);
      const fileAny = files.file;
      const file = Array.isArray(fileAny) ? fileAny[0] : fileAny;
      if (!file?.filepath) return reject(new Error("No file uploaded"));
      resolve({ filepath: file.filepath, cleanup: () => fs.rmSync(uploadDir, { recursive: true, force: true }) });
    });
  });
}

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

    const { filepath, cleanup } = await parseForm(req);
    try {
      const loader = new PDFLoader(filepath, { splitPages: false });
      const docs = await loader.load();

      const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
      const splitDocs = await splitter.splitDocuments(docs);

      const embeddings = new GoogleGenerativeAIEmbeddings({ model: "text-embedding-004", apiKey: process.env.GOOGLE_API_KEY });
      const { CHROMA_URL, CHROMA_CLOUD_API_KEY, CHROMA_TENANT, CHROMA_DATABASE } = process.env;
      try {
        if (CHROMA_CLOUD_API_KEY && CHROMA_TENANT && CHROMA_DATABASE) {
          const index = new CloudClient({ apiKey: CHROMA_CLOUD_API_KEY, tenant: CHROMA_TENANT, database: CHROMA_DATABASE });
          await Chroma.fromDocuments(
            splitDocs,
            embeddings,
            { collectionName: "pdf-qa", index }
          );
        } else if (CHROMA_URL) {
          await Chroma.fromDocuments(
            splitDocs,
            embeddings,
            { collectionName: "pdf-qa"}
          );
        } else {
          await saveHnswFromDocuments(splitDocs, embeddings);
          await upsertMemoryFromDocuments(splitDocs, embeddings);
          return res.status(200).json({ message: "Uploaded and indexed (local)", chunks: splitDocs.length, backend: "local" });
        }
        return res.status(200).json({ message: "Uploaded and indexed", chunks: splitDocs.length, backend: CHROMA_CLOUD_API_KEY ? "chroma-cloud" : "chroma" });
      } catch (e) {
        await saveHnswFromDocuments(splitDocs, embeddings);
        await upsertMemoryFromDocuments(splitDocs, embeddings);
        return res.status(200).json({ message: "Uploaded and indexed (local fallback)", chunks: splitDocs.length, backend: "local", note: "Chroma unreachable; used local index" });
      }

      return res.status(200).json({ message: "Uploaded and indexed", chunks: splitDocs.length });
    } finally {
      cleanup();
    }
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({ error: error?.message || "Internal Server Error" });
  }
}


