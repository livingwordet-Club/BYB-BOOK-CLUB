// Line 1
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
import dotenv from "dotenv";

// Line 15: Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || "72f2f2add23560722469e10034482923";
const BIBLE_API_KEY = process.env.BIBLE_API_KEY;

// Line 22: Supabase Pool Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Crucial for Supabase + Render production
  }
});

const app = express();
app.use(express.json());

// --- PRE-START: Folder Management ---
const rootDir = path.join(__dirname, "..");
const uploadDir = path.join(rootDir, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- MULTER CONFIG FOR PROFILE PICS ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// --- DATABASE INIT ---
async function initDb() {
  try {
    const client = await pool.connect();
    console.log("Successfully connected to Supabase PostgreSQL");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        name TEXT,
        bio TEXT,
        profile_verse TEXT,
        profile_pic TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        cover_url TEXT,
        file_url TEXT,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      "INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, is_admin",
      [username, hashedPassword, email]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.is_admin } });
  } catch (error) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.is_admin } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- USER & DASHBOARD ROUTES ---
app.get("/api/user/profile", authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query("SELECT id, username, email, name, bio, profile_verse, profile_pic FROM users WHERE id = $1", [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.put("/api/user/profile", authenticateToken, async (req: any, res) => {
  const { name, email, bio, profile_verse, profile_pic } = req.body;
  try {
    await pool.query(
      "UPDATE users SET name = $1, email = $2, bio = $3, profile_verse = $4, profile_pic = $5 WHERE id = $6",
      [name, email, bio, profile_verse, profile_pic, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.get("/api/dashboard", authenticateToken, async (req: any, res) => {
  try {
    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    const bookCount = await pool.query("SELECT COUNT(*) FROM books");
    const suggestions = await pool.query("SELECT id, username, name, profile_pic FROM users WHERE id != $1 LIMIT 5", [req.user.id]);
    
    res.json({
      stats: {
        totalUsers: parseInt(userCount.rows[0].count),
        totalBooks: parseInt(bookCount.rows[0].count),
        activeReaders: Math.floor(parseInt(userCount.rows[0].count) * 0.7)
      },
      suggestions: suggestions.rows
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// --- BOOK ROUTES ---
app.get("/api/books", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// --- ADMIN ROUTES ---
app.get("/api/admin/stats", authenticateToken, async (req: any, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: "Unauthorized" });
  try {
    const allUsers = await pool.query("SELECT id, username, is_admin FROM users");
    res.json({ allUsers: allUsers.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

app.post("/api/admin/upload-book", authenticateToken, upload.single('file'), async (req: any, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: "Unauthorized" });
  const { title, author, cover_url, category } = req.body;
  const file_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await pool.query(
      "INSERT INTO books (title, author, cover_url, file_url, category) VALUES ($1, $2, $3, $4, $5)",
      [title, author, cover_url, file_url, category]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload book" });
  }
});

// --- MESSAGES ---
app.get("/api/messages", authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE sender_id = $1 OR receiver_id = $1 ORDER BY created_at ASC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/messages", authenticateToken, async (req: any, res) => {
  const { receiver_id, content } = req.body;
  try {
    await pool.query(
      "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)",
      [req.user.id, receiver_id, content]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// --- ACCOUNT DELETION ---
app.delete("/api/user/account", authenticateToken, async (req: any, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    res.json({ success: true });
  } catch (error) { 
    res.status(500).json({ error: "Failed to delete account" }); 
  }
});

// --- SERVER START ---
// Line 268
// Line 268: Replace your startServer function with this precise version
async function startServer() {
  await initDb();
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    // Correctly resolve paths relative to the project root
    // Since server.js is in 'dist', the static files are in the same folder
    const distPath = path.resolve(__dirname, 'dist');
    
    // Line 278: Serve static files (js, css, images)
    app.use(express.static(distPath));

    // Line 281: Handle SPA routing
    app.get("*", (req, res) => {
      // Guard: If it's a file request that reached here, it doesn't exist.
      if (req.path.includes('.') || req.path.startsWith('/api')) {
        return res.status(404).send('Not Found');
      }
      // Line 286: Send the index.html for all other routes
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = process.env.PORT || 10000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server live on port ${PORT}`);
  });
}
// --- BIBLE API PROXY ROUTES ---
const BIBLE_BASE_URL = "https://api.scripture.api.bible/v1";

app.get("/api/bible/versions", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${BIBLE_BASE_URL}/bibles`, {
      headers: { 'api-key': BIBLE_API_KEY }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Bible versions" });
  }
});

startServer();
