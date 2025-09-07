import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import fs from "fs";
import path from "path";

let memoryStore = null;

export async function upsertMemoryFromDocuments(docs, embeddings) {
  if (!memoryStore) {
    memoryStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
  } else {
    await memoryStore.addDocuments(docs);
  }
  return memoryStore;
}

export function getExistingMemoryStore() {
  return memoryStore;
}

const DATA_DIR = path.join(process.cwd(), "data");
const HNSW_PATH = path.join(DATA_DIR, "hnsw-index");

export async function saveHnswFromDocuments(docs, embeddings) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const store = await HNSWLib.fromDocuments(docs, embeddings);
  await store.save(HNSW_PATH);
  return store;
}

export async function loadHnswIfExists(embeddings) {
  if (fs.existsSync(HNSW_PATH)) {
    return await HNSWLib.load(HNSW_PATH, embeddings);
  }
  return null;
}


