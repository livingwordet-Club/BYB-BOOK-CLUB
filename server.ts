import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import axios from "axios";

const JWT_SECRET = 72f2f2add23560722469e10034482923;
const db = new Database("library.db");
console.log("Database initialized at library.db");

// Initialize Database
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    email TEXT,
    bio TEXT,
    profile_verse TEXT,
    profile_pic TEXT,
    youtube_playlist TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    author TEXT,
    cover_url TEXT,
    content TEXT,
    is_trending INTEGER DEFAULT 0,
    is_new INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_reads (
    user_id INTEGER,
    book_id INTEGER,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, book_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER,
    friend_id INTEGER,
    status TEXT DEFAULT 'pending',
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'highlight', 'bookmark', 'note', 'prayer', 'quote'
    content TEXT,
    metadata TEXT, -- JSON string for color, book_id, verse, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_users ON messages(sender_id, receiver_id);
  CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id);
`);

// Create Admin if not exists
const adminCheck = db.prepare("SELECT * FROM users WHERE username = ?").get("bybmkcadmin");
if (!adminCheck) {
  const hashedPassword = bcrypt.hashSync("@2026bybMKC", 10);
  db.prepare("INSERT INTO users (username, password, name, is_admin) VALUES (?, ?, ?, ?)").run(
    "bybmkcadmin",
    hashedPassword,
    "BYB MKC Admin",
    1
  );
}

// Cleanup: Delete all users except the admin (as requested by user)
db.prepare("DELETE FROM users WHERE username != 'bybmkcadmin'").run();
console.log("Database cleanup: All non-admin users purged.");

const app = express();
app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    
    // Verify user still exists in database
    const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(decoded.id);
    if (!userExists) {
      return res.status(401).json({ error: "User no longer exists. Please login again." });
    }
    
    req.user = decoded;
    next();
  });
};

// API Routes
app.post("/api/auth/register", (req, res) => {
  const { username, password, email } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (username, password, email) VALUES (?, ?, ?)").run(
      username,
      hashedPassword,
      email
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for: ${username}`);
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    console.log(`Login failed for: ${username}`);
    return res.status(401).json({ error: "Invalid credentials" });
  }
  console.log(`Login success for: ${username}`);
  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.is_admin, name: user.name } });
});

app.post("/api/auth/reset-password", (req, res) => {
    const { username, newPassword } = req.body;
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hashedPassword, username);
    if (result.changes > 0) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

app.get("/api/user/profile", authenticateToken, (req: any, res) => {
  const user = db.prepare("SELECT id, username, name, email, bio, profile_verse, profile_pic, is_admin FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.put("/api/user/profile", authenticateToken, (req: any, res) => {
  const { name, email, bio, profile_verse, profile_pic } = req.body;
  db.prepare("UPDATE users SET name = ?, email = ?, bio = ?, profile_verse = ?, profile_pic = ? WHERE id = ?").run(
    name, email, bio, profile_verse, profile_pic, req.user.id
  );
  res.json({ success: true });
});

app.get("/api/dashboard", authenticateToken, (req: any, res) => {
  const trending = db.prepare("SELECT * FROM books WHERE is_trending = 1 LIMIT 5").all();
  const updates = db.prepare("SELECT * FROM books WHERE is_new = 1 ORDER BY created_at DESC LIMIT 5").all();
  const currentRead = db.prepare(`
    SELECT b.* FROM books b 
    JOIN user_reads ur ON b.id = ur.book_id 
    WHERE ur.user_id = ? 
    ORDER BY ur.last_read_at DESC LIMIT 1
  `).get(req.user.id);
  const suggestions = db.prepare("SELECT id, username, name, profile_pic FROM users WHERE id != ? AND id NOT IN (SELECT friend_id FROM friends WHERE user_id = ?) LIMIT 5").all(req.user.id, req.user.id);
  
  res.json({ trending, updates, currentRead, suggestions });
});

app.get("/api/books", authenticateToken, (req, res) => {
  const books = db.prepare("SELECT * FROM books").all();
  res.json(books);
});

app.post("/api/books", authenticateToken, (req: any, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    const { title, author, cover_url, content, is_trending, is_new } = req.body;
    db.prepare("INSERT INTO books (title, author, cover_url, content, is_trending, is_new) VALUES (?, ?, ?, ?, ?, ?)").run(
        title, author, cover_url, content, is_trending ? 1 : 0, is_new ? 1 : 0
    );
    res.json({ success: true });
});

app.get("/api/messages", authenticateToken, (req: any, res) => {
    const messages = db.prepare(`
        SELECT m.*, u.username as sender_name FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE receiver_id = ? OR sender_id = ?
        ORDER BY created_at ASC
    `).all(req.user.id, req.user.id);
    res.json(messages);
});

app.post("/api/messages", authenticateToken, (req: any, res) => {
    const { receiver_id, content } = req.body;
    db.prepare("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)").run(
        req.user.id, receiver_id, content
    );
    res.json({ success: true });
});

app.get("/api/activity", authenticateToken, (req: any, res) => {
    const activity = db.prepare("SELECT * FROM user_activity WHERE user_id = ?").all(req.user.id);
    res.json(activity);
});

app.post("/api/activity", authenticateToken, (req: any, res) => {
    const { type, content, metadata } = req.body;
    db.prepare("INSERT INTO user_activity (user_id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        req.user.id, type, content, JSON.stringify(metadata)
    );
    res.json({ success: true });
});

// Admin Stats
app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    const bookCount = db.prepare("SELECT COUNT(*) as count FROM books").get();
    const recentActivity = db.prepare(`
        SELECT ua.*, u.username FROM user_activity ua
        JOIN users u ON ua.user_id = u.id
        ORDER BY created_at DESC LIMIT 20
    `).all();
    const allUsers = db.prepare("SELECT id, username, name, email, is_admin FROM users").all();
    res.json({ userCount: userCount.count, bookCount: bookCount.count, recentActivity, allUsers });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // ... (after all routes)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  const PORT = 3000;
  // Audio Books API (LibriVox - Christian Focus)
app.get("/api/audiobooks", authenticateToken, async (req, res) => {
  try {
    console.log("Fetching audiobooks from LibriVox...");
    // Searching for Christian classics on LibriVox
    // Using a more reliable query format
    const response = await axios.get("https://librivox.org/api/feed/audiobooks", {
      params: {
        format: "json",
        limit: 50,
        genre: "Christianity"
      },
      timeout: 10000 // 10 second timeout
    });
    
    const books = response.data.books || [];
    console.log(`Successfully fetched ${books.length} audiobooks from LibriVox`);
    res.json(books);
  } catch (error: any) {
    console.error("LibriVox API Error:", error.message);
    // If it's a timeout or network error, return empty array so frontend doesn't crash
    res.status(200).json([]); 
  }
});

app.delete("/api/user/delete", authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  
  // Start a transaction to ensure all related data is deleted
  const deleteTransaction = db.transaction(() => {
    db.prepare("DELETE FROM user_activity WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_reads WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM friends WHERE user_id = ? OR friend_id = ?").run(userId, userId);
    db.prepare("DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?").run(userId, userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  try {
    deleteTransaction();
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete account:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
