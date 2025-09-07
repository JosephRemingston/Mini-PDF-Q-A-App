# Mini PDF Q&A App


A PDF question-answering application that lets you chat with your documents using AI.

## Approach

**Note:** I used the Gemini API instead of the OpenAI API because OpenAI does not offer a free tier for API keys and only provides a pay-as-you-go option.


This app uses a multi-step process to enable intelligent Q&A with PDF documents:

1. **PDF Processing**: Extracts text from PDFs and splits it into manageable chunks
2. **Embedding Generation**: Uses Gemini AI to create vector embeddings of the text chunks
3. **Semantic Search**: Stores embeddings in ChromaDB for efficient similarity search
4. **Question Answering**: Combines relevant chunks with Gemini AI to generate accurate answers

## Quick Setup

### Requirements
- Node.js 18+
- Google AI API key
- MongoDB instance (for user data)
- ChromaDB (optional, falls back to in-memory)

### Install & Run
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev
```

### Environment Setup
Create `.env.local` with these variables:
```bash
# Required
GOOGLE_API_KEY=your-gemini-api-key
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-secret-key

# Optional - ChromaDB Configuration
CHROMA_URL=http://localhost:8000  # Local ChromaDB
# OR for ChromaDB Cloud:
# CHROMA_CLOUD_API_KEY=your-key
# CHROMA_TENANT=your-tenant
# CHROMA_DATABASE=your-database
```

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

## API Usage

All endpoints require header: `x-api-key: your-api-key`

```typescript
// Upload PDF
POST /api/upload
Content-Type: multipart/form-data
Body: { file: PDF_FILE }

// Ask questions
POST /api/ask
Content-Type: application/json
Body: { "question": "your question here" }
```

## Notes

- Without ChromaDB configuration, the app uses in-memory storage (resets on restart)
- For production, implement proper authentication and API key rotation
- ChromaDB can be run locally with Docker or used via ChromaDB Cloud
```
pdf-parse-gpt/
├── app/              # Next.js app router components
├── data/             # Vector store data (configurable)
├── lib/              # Core utilities
├── models/           # Mongoose models
├── pages/            # API routes and pages
│   ├── api/         # Backend API endpoints
│   └── ...         # Frontend pages
├── public/          # Static assets
└── types/           # TypeScript type definitions
```

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
