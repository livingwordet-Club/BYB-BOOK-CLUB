import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import multer from "multer";
import fs from "fs";

// --- GLOBAL CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || "72f2f2add23560722469e10034482923";
const BIBLE_API_KEY = process.env.BIBLE_API_KEY; 

// --- DIRECTORY SETUP ---
const rootDir = path.join(__dirname, "..");
const uploadDir = path.join(rootDir, "uploads");

if (!fs.existsSync(uploadDir)) {
    console.log("Creating uploads directory at:", uploadDir);
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- MULTER STORAGE ENGINE ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile-${req.user?.id || 'anon'}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed") as any, false);
    }
  }
});

// --- POSTGRES DATABASE CONNECTION ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// --- DATABASE SCHEMA INITIALIZATION ---
async function initDb() {
  const client = await pool.connect();
  try {
    console.log("Initializing database tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        email TEXT,
        bio TEXT,
        profile_verse TEXT,
        profile_pic TEXT,
        is_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS highlights (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        verse_ref TEXT NOT NULL,
        content TEXT,
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prayers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        verse_ref TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        cover_url TEXT,
        content TEXT,
        is_trending INTEGER DEFAULT 0,
        is_new INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reading_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        last_chapter TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database successfully initialized.");
  } catch (err) {
    console.error("Error during database initialization:", err);
  } finally {
    client.release();
  }
}

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = decoded;
    next();
  });
};

// --- API ROUTES: AUTHENTICATION ---
app.post("/api/auth/register", async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username", 
      [username, hashedPassword, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) {
    res.status(400).json({ error: "Registration failed. User may already exist." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = userRes.rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
});

// --- API ROUTES: USER PROFILE & PROGRESS ---
app.get("/api/user/profile", authenticateToken, async (req: any, res) => {
    try {
        const result = await pool.query("SELECT id, username, email, name, bio, profile_verse, profile_pic FROM users WHERE id = $1", [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

app.post("/api/user/profile", authenticateToken, upload.single('profilePic'), async (req: any, res) => {
    const { name, bio, profile_verse } = req.body;
    const profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;
    
    try {
        if (profilePic) {
            await pool.query(
                "UPDATE users SET name = $1, bio = $2, profile_verse = $3, profile_pic = $4 WHERE id = $5",
                [name, bio, profile_verse, profilePic, req.user.id]
            );
        } else {
            await pool.query(
                "UPDATE users SET name = $1, bio = $2, profile_verse = $3 WHERE id = $4",
                [name, bio, profile_verse, req.user.id]
            );
        }
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

app.get("/api/user/progress", authenticateToken, async (req: any, res) => {
    try {
        const result = await pool.query(
            "SELECT rp.*, b.title as book_title FROM reading_progress rp JOIN books b ON rp.book_id = b.id WHERE rp.user_id = $1 ORDER BY updated_at DESC", 
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch progress" });
    }
});

app.post("/api/user/progress", authenticateToken, async (req: any, res) => {
    const { bookId, lastChapter } = req.body;
    try {
        await pool.query(
            "INSERT INTO reading_progress (user_id, book_id, last_chapter) VALUES ($1, $2, $3) ON CONFLICT (user_id, book_id) DO UPDATE SET last_chapter = $3, updated_at = CURRENT_TIMESTAMP",
            [req.user.id, bookId, lastChapter]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update progress" });
    }
});

// --- API ROUTES: BIBLE FEATURES ---
app.get('/api/user/bible-data', authenticateToken, async (req: any, res) => {
  try {
    const highlights = await pool.query("SELECT * FROM highlights WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    const prayers = await pool.query("SELECT * FROM prayers WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    res.json({ highlights: highlights.rows, prayers: prayers.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user bible data" });
  }
});

app.post('/api/highlights', authenticateToken, async (req: any, res) => {
  const { verseRef, content, color } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO highlights (user_id, verse_ref, content, color) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, verseRef, content, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to save highlight" });
  }
});

app.post('/api/prayers', authenticateToken, async (req: any, res) => {
  const { verseRef, note } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO prayers (user_id, verse_ref, note) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, verseRef, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to save prayer" });
  }
});

// --- API ROUTES: EXTERNAL BIBLE API PROXY ---
const BIBLE_BASE_URL = "https://api.scripture.api.bible/v1";

app.get("/api/bible/versions", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${BIBLE_BASE_URL}/bibles`, { 
        headers: { 'api-key': BIBLE_API_KEY } 
    });
    res.json(response.data.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Bible versions" });
  }
});

app.get("/api/bible/:bibleId/books", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${BIBLE_BASE_URL}/bibles/${req.params.bibleId}/books`, { 
        headers: { 'api-key': BIBLE_API_KEY } 
    });
    res.json(response.data.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

app.get("/api/bible/:bibleId/books/:bookId/chapters", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${BIBLE_BASE_URL}/bibles/${req.params.bibleId}/books/${req.params.bookId}/chapters`, { 
        headers: { 'api-key': BIBLE_API_KEY } 
    });
    res.json(response.data.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chapters" });
  }
});

app.get("/api/bible/:bibleId/chapters/:chapterId", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${BIBLE_BASE_URL}/bibles/${req.params.bibleId}/chapters/${req.params.chapterId}`, {
        headers: { 'api-key': BIBLE_API_KEY },
        params: { 'content-type': 'html', 'include-verse-numbers': true }
    });
    res.json(response.data.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scripture content" });
  }
});

// --- API ROUTES: BOOK CLUB ---
app.get("/api/books", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM books ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch books" });
    }
});

app.get("/api/books/trending", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM books WHERE is_trending = 1 LIMIT 5");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch trending books" });
    }
});

// --- SERVER LIFECYCLE ---
async function startServer() {
  await initDb();

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in Development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in Production mode...");
    const distPath = path.join(rootDir, "dist");
    
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    } else {
        console.warn("Dist folder not found!");
    }
  }

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`BYB Book Club Server is live at http://localhost:${PORT}`);
  });
}

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Server Error:", err.stack);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
});

startServer().catch(err => {
    console.error("Failed to start server process:", err);
});
