Mini PDF Q&A App using Next.js, LangChain, Gemini (Google Generative AI), and ChromaDB.

## Features
- Upload a PDF, extract text, chunk, embed with Gemini embeddings, and store in Chroma (persisted in `data/`).
- Ask questions; retrieves top chunks and answers with Gemini via LangChain RetrievalQA.
- Simple Tailwind UI.

## Prerequisites
- Node 18+
- A Google Generative AI API key.

## Setup
1. Install dependencies:
```bash
npm install
```
2. Create `.env.local` in the project root:
```bash
GOOGLE_API_KEY=your-gemini-key
NEXT_PUBLIC_API_KEY=your-simple-api-key
# If running a Chroma server, point to it (default localhost:8000)
# CHROMA_URL=http://localhost:8000
# Or use Chroma Cloud
# CHROMA_CLOUD_API_KEY=...
# CHROMA_TENANT=...
# CHROMA_DATABASE=...

# MongoDB & Auth
MONGODB_URI=mongodb+srv://user:pass@cluster/db
JWT_SECRET=use-a-long-random-secret
```
3. Run the dev server:
```bash
npm run dev
```

## API
All API routes require header `x-api-key: NEXT_PUBLIC_API_KEY`.

### POST /api/upload
Multipart form with field `file` (PDF). Processes and persists embeddings.

### POST /api/ask
JSON body `{ "question": "..." }`. Returns `{ answer }`.

## Notes
- If `CHROMA_URL` is not set, the app uses an in-memory vector store. This resets on server restart.
- For production, secure and rotate your API key and consider auth.

## Running Chroma with CORS
To use a Chroma server, start it with CORS allowing your Next.js origin. Example:
```bash
docker run -p 8000:8000 \
  -e CHROMA_SERVER_CORS_ALLOW_ORIGINS="http://localhost:3000" \
  -e CHROMA_SERVER_AUTH_CREDENTIALS_PROVIDER="chromadb.auth.token.TokenConfigServerAuthCredentialsProvider" \
  -e CHROMA_SERVER_AUTH_CREDENTIALS="{}" \
  ghcr.io/chroma-core/chroma:latest
```
Then set `CHROMA_URL=http://localhost:8000` in `.env.local`.

## Using Chroma Cloud
Set these variables in `.env.local` to use Chroma Cloud:
```bash
CHROMA_CLOUD_API_KEY=your-cloud-api-key
CHROMA_TENANT=your-tenant-id
CHROMA_DATABASE=your-database-name-or-id
```
If these are set, the app will connect using Chroma's `CloudClient`. Otherwise it falls back to `CHROMA_URL`, then to in-memory.
