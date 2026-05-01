import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import { User } from "./src/models/User.ts";
import { Scan } from "./src/models/Scan.ts";
import { performScan, saveScan } from "./src/controllers/scanController.ts";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// Check Gemini API Key on startup
const rawGeminiKey = process.env.GEMINI_API_KEY;
if (rawGeminiKey) {
  const trimmedKey = rawGeminiKey.trim();
  console.log(`GEMINI_API_KEY loaded. Length: ${trimmedKey.length}. Prefix: ${trimmedKey.substring(0, 6)}... Suffix: ...${trimmedKey.substring(trimmedKey.length - 4)}`);
} else {
  console.warn("GEMINI_API_KEY is missing in environment variables.");
}

// Check MongoDB URI on startup
const rawMongoUri = process.env.MONGODB_URI;
if (rawMongoUri) {
  const trimmedUri = rawMongoUri.trim();
  console.log(`MONGODB_URI loaded. Length: ${trimmedUri.length}. Prefix: ${trimmedUri.substring(0, 15)}...`);
} else {
  console.warn("MONGODB_URI is missing in environment variables.");
}

app.use(express.json());

// Multer setup for image uploads
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI?.trim();
if (MONGODB_URI) {
  console.log(`Attempting to connect to MongoDB with prefix: ${MONGODB_URI.substring(0, 15)}...`);
  if (!MONGODB_URI.startsWith("mongodb://") && !MONGODB_URI.startsWith("mongodb+srv://")) {
    console.error(`CRITICAL: Invalid MONGODB_URI scheme. It starts with: "${MONGODB_URI.substring(0, 10)}..."`);
  }
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("Successfully connected to MongoDB"))
    .catch((err) => {
      console.error("MongoDB connection error details:", err);
    });
} else {
  console.warn("MONGODB_URI is missing. Please check your .env or Secrets panel.");
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// Optional Auth Middleware for Guest Scans
const optionalAuthenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// --- API ROUTES ---

// Auth: Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET);
    res.status(201).json({ token, user: { email: user.email, healthConditions: user.healthConditions } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Auth: Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { email: user.email, healthConditions: user.healthConditions } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Profile: Update Health Profile
app.put("/api/profile", authenticateToken, async (req: any, res) => {
  try {
    const { healthConditions, allergies } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { healthConditions, allergies },
      { new: true }
    );
    res.json({ healthConditions: user?.healthConditions, allergies: user?.allergies });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Profile: Get User Data
app.get("/api/profile", authenticateToken, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ email: user?.email, healthConditions: user?.healthConditions, allergies: user?.allergies });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Scan: Perform AI Analysis
app.post("/api/scan", optionalAuthenticateToken, upload.single('image'), performScan);
app.post("/api/scan/save", authenticateToken, saveScan);

// Scan: Get History
app.get("/api/scan/history", authenticateToken, async (req: any, res) => {
  try {
    const history = await Scan.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(history);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
