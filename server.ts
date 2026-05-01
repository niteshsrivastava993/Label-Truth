import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "./src/lib/db.js";
import { User } from "./src/models/user.js";
import { Scan } from "./src/models/scan.js";
import { performScan, saveScan } from "./src/controllers/scan-controller.js";

dotenv.config();

// --- GLOBAL ERROR HANDLERS (CRITICAL FOR PRODUCTION) ---
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
  // Optional: keep running or exit
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Security & Middlewares
app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:3000"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());

// Rate Limiting to prevent API abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Anti-Sleep / Health Check
app.get("/api/ping", (req, res) => {
  res.status(200).send("pong");
});

// Multer setup for image uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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

// --- VITE MIDDLEWARE & SERVER START ---

async function startServer() {
  console.log("Starting server initialization...");
  
  // 1. Connect Database
  try {
    await connectDB();
    console.log("Database connection sequence complete.");
  } catch (dbErr) {
    console.error("CRITICAL: Database connection failed during startup:", dbErr);
    // On Render, we might want to continue or exit depending on strategy.
    // For now, we continue to allow the process to stay alive for debugging.
  }

  // 2. Setup Vite or Static Serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Development mode: Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production mode: Setting up static file serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 3. Listen
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log("Ready to handle requests.");
  });
}

startServer().catch(err => {
  console.error("FATAL: Server failed to start:", err);
  process.exit(1);
});
