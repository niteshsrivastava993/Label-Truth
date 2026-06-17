# Label Truth — Local Dev Setup (Groq + No External Storage)

AI-powered food label analyzer. Uses **Groq** for vision analysis and **sharp** for
image processing. No Cloudinary, no external image storage — images are compressed
and stored as base64 directly in MongoDB.

## Architecture

```
Frontend  →  Vite       (http://localhost:5173)
Backend   →  Express    (http://localhost:3000)
Database  →  MongoDB Atlas  (stores images as compressed base64)
AI        →  Groq API   (meta-llama/llama-4-scout-17b-16e-instruct)
Images    →  sharp      (compress → base64 → MongoDB, no 3rd-party needed)
```

Vite dev server proxies all `/api/*` requests to Express on `:3000`,
so both run simultaneously with zero CORS issues.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in:

| Key | Where to get it |
|-----|-----------------|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET` | Any long random string |
| `GROQ_API_KEY` | https://console.groq.com/keys  ← free tier |

That's it. No Cloudinary, no other keys needed.

### 3. Run (one command — starts both servers)
```bash
npm run dev
```

- Express API  →  **http://localhost:3000**
- Vite UI      →  **http://localhost:5173**  ← open this in your browser

### Or run separately
```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

## Image Storage

Images are processed entirely on your machine:

1. User uploads an image (up to 5 MB)
2. **sharp** resizes it to max 800×800px and re-encodes as JPEG at 75% quality (~50–100 KB)
3. The compressed image is sent to Groq as an inline base64 data URI
4. The same base64 string is stored in MongoDB as `imageUrl` on the scan document

No S3, no Cloudinary, no upload preset, no extra API keys.

## Folder Structure

```
├── server.ts                        # Express API server
├── src/
│   ├── controllers/
│   │   └── scan-controller.ts       # Groq vision + sharp compression
│   ├── lib/
│   │   └── db.ts                    # MongoDB connection (singleton)
│   ├── models/
│   │   ├── user.ts                  # User schema
│   │   └── scan.ts                  # Scan history schema
│   ├── services/
│   │   └── api.ts                   # Frontend API service layer
│   └── pages/                       # React page components (untouched)
├── vite.config.ts                   # Vite + /api proxy to :3000
├── .env                             # Your local secrets (never commit)
└── .env.example                     # Template
```

