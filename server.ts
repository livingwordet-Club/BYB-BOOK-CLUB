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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || "72f2f2add23560722469e10034482923";

// --- PRE-START CHECKS ---
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- MULTER CONFIG FOR PROFILE PICS ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req: any, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed") as any, false);
    }
  }
});

// --- SUPABASE CONNECTION ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(uploadDir));

// --- INITIALIZE TABLES ---
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        email TEXT,
        bio TEXT,
        profile_verse TEXT,
        profile_pic TEXT,
        youtube_playlist TEXT,
        is_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT,
        author TEXT,
        cover_url TEXT,
        content TEXT,
        is_trending INTEGER DEFAULT 0,
        is_new INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_reads (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, book_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS friends (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        PRIMARY KEY (user_id, friend_id)
      );

      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type TEXT,
        content TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const adminCheck = await client.query("SELECT * FROM users WHERE username = $1", ["bybmkcadmin"]);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync("@2026bybMKC", 10);
      await client.query(
        "INSERT INTO users (username, password, name, is_admin) VALUES ($1, $2, $3, $4)",
        ["bybmkcadmin", hashedPassword, "BYB MKC Admin", 1]
      );
    }
    console.log("Connected to Supabase (PostgreSQL) successfully!");
  } finally {
    client.release();
  }
}

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    const userRes = await pool.query("SELECT id, is_admin FROM users WHERE id = $1", [decoded.id]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: "User no longer exists" });
    req.user = { ...decoded, isAdmin: userRes.rows[0].is_admin === 1 };
    next();
  });
};

// --- ROUTES ---

// Auth
app.post("/api/auth/register", async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = await pool.query("INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id", [username, hash, email]);
    res.json({ id: result.rows[0].id });
  } catch (e) { res.status(400).json({ error: "User already exists" }); }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const userRes = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  const user = userRes.rows[0];
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Wrong credentials" });
  
  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin === 1 }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.is_admin === 1, name: user.name } });
});

// User Profile & Image Upload
app.get("/api/user/profile", authenticateToken, async (req: any, res) => {
  const user = await pool.query("SELECT id, username, name, email, bio, profile_verse, profile_pic, is_admin FROM users WHERE id = $1", [req.user.id]);
  res.json(user.rows[0]);
});

app.put("/api/user/profile", authenticateToken, async (req: any, res) => {
  const { name, email, bio, profile_verse, profile_pic } = req.body;
  await pool.query("UPDATE users SET name = $1, email = $2, bio = $3, profile_verse = $4, profile_pic = $5 WHERE id = $6", [name, email, bio, profile_verse, profile_pic, req.user.id]);
  res.json({ success: true });
});

app.post("/api/user/upload-avatar", authenticateToken, upload.single("avatar"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = `/uploads/${req.file.filename}`;
  try {
    await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [filePath, req.user.id]);
    res.json({ success: true, url: filePath });
  } catch (err) {
    res.status(500).json({ error: "Database update failed" });
  }
});

// --- FIXED DASHBOARD ROUTE (Changed from SQLite 'db' to Postgres 'pool') ---
app.get("/api/dashboard", authenticateToken, async (req: any, res) => {
  try {
    const trending = await pool.query("SELECT * FROM books WHERE is_trending = 1 LIMIT 5");
    const updates = await pool.query("SELECT * FROM books WHERE is_new = 1 ORDER BY created_at DESC LIMIT 5");
    
    const currentRead = await pool.query(`
      SELECT b.* FROM books b 
      JOIN user_reads ur ON b.id = ur.book_id 
      WHERE ur.user_id = $1 
      ORDER BY ur.last_read_at DESC LIMIT 1
    `, [req.user.id]);

    const suggestions = await pool.query(`
      SELECT id, username, name, profile_pic FROM users 
      WHERE id != $1 AND id NOT IN (SELECT friend_id FROM friends WHERE user_id = $1) 
      LIMIT 5
    `, [req.user.id]);
    
    const recentMessages = await pool.query(`
      SELECT m.*, u.username as sender_name, u.profile_pic as sender_pic 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.receiver_id = $1
      ORDER BY m.created_at DESC LIMIT 5
    `, [req.user.id]);

    res.json({ 
      trending: trending.rows, 
      updates: updates.rows, 
      currentRead: currentRead.rows[0], 
      suggestions: suggestions.rows,
      recentMessages: recentMessages.rows 
    });
  } catch (err) {
    res.status(500).json({ error: "Dashboard data fetch failed" });
  }
});

// Books
app.get("/api/books", authenticateToken, async (req, res) => {
  const books = await pool.query("SELECT * FROM books");
  res.json(books.rows);
});

app.post("/api/books", authenticateToken, async (req: any, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    const { title, author, cover_url, content, is_trending, is_new } = req.body;
    await pool.query("INSERT INTO books (title, author, cover_url, content, is_trending, is_new) VALUES ($1, $2, $3, $4, $5, $6)", [title, author, cover_url, content, is_trending ? 1 : 0, is_new ? 1 : 0]);
    res.json({ success: true });
});

// Messages
app.get("/api/messages", authenticateToken, async (req: any, res) => {
  const msg = await pool.query("SELECT m.*, u.username as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE receiver_id = $1 OR sender_id = $1 ORDER BY created_at ASC", [req.user.id]);
  res.json(msg.rows);
});

app.post("/api/messages", authenticateToken, async (req: any, res) => {
  const { receiver_id, content } = req.body;
  await pool.query("INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)", [req.user.id, receiver_id, content]);
  res.json({ success: true });
});

// Activity
app.get("/api/activity", authenticateToken, async (req: any, res) => {
    const activity = await pool.query("SELECT * FROM user_activity WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    res.json(activity.rows);
});

app.post("/api/activity", authenticateToken, async (req: any, res) => {
    const { type, content, metadata } = req.body;
    await pool.query("INSERT INTO user_activity (user_id, type, content, metadata) VALUES ($1, $2, $3, $4)", [req.user.id, type, content, JSON.stringify(metadata)]);
    res.json({ success: true });
});

// Admin Stats
app.get("/api/admin/stats", authenticateToken, async (req: any, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    const bookCount = await pool.query("SELECT COUNT(*) FROM books");
    const recentActivity = await pool.query("SELECT ua.*, u.username FROM user_activity ua JOIN users u ON ua.user_id = u.id ORDER BY created_at DESC LIMIT 20");
    const allUsers = await pool.query("SELECT id, username, name, email, is_admin FROM users");
    res.json({ userCount: userCount.rows[0].count, bookCount: bookCount.rows[0].count, recentActivity: recentActivity.rows, allUsers: allUsers.rows });
});

// Audiobooks
app.get("/api/audiobooks", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get("https://librivox.org/api/feed/audiobooks", {
      params: { format: "json", limit: 50, genre: "Christianity" },
      timeout: 10000
    });
    res.json(response.data.books || []);
  } catch (error) { res.json([]); }
});

// Delete Account
app.delete("/api/user/delete", authenticateToken, async (req: any, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Failed to delete account" }); }
});

// --- SERVER START ---
async function startServer() {
  await initDb();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    // Correct production serving
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return;
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server live on port ${PORT}`);
  });
}

startServer();
