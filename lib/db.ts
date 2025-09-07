import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not set. Auth routes will fail until configured.");
}

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) return cached.conn as typeof mongoose;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || undefined,
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn as typeof mongoose;
}


