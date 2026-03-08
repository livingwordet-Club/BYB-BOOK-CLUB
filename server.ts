import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Database Setup
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors());
app.use(express.json());

// Multer for memory storage (Supabase uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage });
const bookUpload = upload.fields([
  { name: 'bookFile', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

// Helper to upload to Supabase
const uploadToSupabase = async (file: Express.Multer.File, bucket: string) => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
};

// Database Initialization
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        name TEXT,
        bio TEXT,
        profile_verse TEXT,
        profile_pic TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        release_year TEXT,
        is_trending BOOLEAN DEFAULT FALSE,
        is_new BOOLEAN DEFAULT TRUE,
        cover_url TEXT,
        file_url TEXT,
        category TEXT DEFAULT 'Spiritual',
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Ensure missing columns exist in books table
    await pool.query(`
      ALTER TABLE books ADD COLUMN IF NOT EXISTS release_year TEXT;
      ALTER TABLE books ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE;
      ALTER TABLE books ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT TRUE;
    `);

    // Socials & Activity Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        image_url TEXT,
        type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'verse'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL, -- 'read', 'post', 'comment', 'like', 'join'
        target_id INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS highlights (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        verse_ref TEXT NOT NULL,
        content TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prayers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        verse_ref TEXT,
        note TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        target_type VARCHAR(50) NOT NULL, -- 'bible', 'book'
        target_id TEXT NOT NULL, -- verse ref or book id
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        author TEXT,
        source TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        verse_ref TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
}

initDb();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, content } = data;
    try {
      const result = await pool.query(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
        [senderId, receiverId, content]
      );
      const newMessage = result.rows[0];
      io.to(`user-${receiverId}`).emit('receive_message', newMessage);
      socket.emit('message_sent', newMessage);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// --- HELPERS ---
const logActivity = async (userId: number, type: string, targetId?: number, description?: string) => {
  try {
    await pool.query(
      'INSERT INTO activities (user_id, action_type, target_id, description) VALUES ($1, $2, $3, $4)',
      [userId, type, targetId, description]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// --- API ROUTES ---

// Auth
app.delete('/api/user/delete', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

app.post('/api/user/profile-pic', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const url = await uploadToSupabase(req.file, 'profiles');
    await pool.query('UPDATE users SET profile_pic = $1 WHERE id = $2', [url, req.user.id]);
    res.json({ url });
  } catch (err) {
    console.error('Profile pic upload error:', err);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, hashedPassword, email]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.is_admin } });
  } catch (err: any) {
    res.status(400).json({ error: err.message.includes('unique') ? 'Username or email already exists' : 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.is_admin, name: user.name } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Dashboard
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const booksCount = await pool.query('SELECT COUNT(*) FROM books');
    const activeReadersCount = await pool.query('SELECT COUNT(DISTINCT user_id) FROM activities WHERE created_at > NOW() - INTERVAL \'24 hours\'');
    const suggestions = await pool.query('SELECT id, username, name, profile_pic FROM users WHERE id != $1 LIMIT 5', [req.user.id]);
    
    // Real trending books (most recently uploaded for now)
    const trendingBooks = await pool.query('SELECT * FROM books ORDER BY created_at DESC LIMIT 4');
    
    // Activity Tracker Data (Last 7 days count)
    const activityStats = await pool.query(`
      SELECT 
        TO_CHAR(date_series, 'Dy') as day,
        COALESCE(count, 0) as count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') as date_series
      LEFT JOIN (
        SELECT DATE(created_at) as activity_date, COUNT(*) as count
        FROM activities
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
      ) activity_data ON DATE(date_series) = activity_data.activity_date
      ORDER BY date_series ASC
    `, [req.user.id]);

    // Real recent messages
    const recentMessages = await pool.query(`
      SELECT m.*, u.username as sender_username, u.name as sender_name, u.profile_pic as sender_pic
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.receiver_id = $1
      ORDER BY m.created_at DESC
      LIMIT 5
    `, [req.user.id]);

    res.json({
      stats: {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalBooks: parseInt(booksCount.rows[0].count),
        activeReaders: parseInt(activeReadersCount.rows[0].count) || 0
      },
      suggestions: suggestions.rows,
      trendingBooks: trendingBooks.rows,
      recentMessages: recentMessages.rows,
      activityStats: activityStats.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Books
app.get('/api/books', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT name, email, bio, profile_verse, profile_pic FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { name, email, bio, profile_verse, profile_pic } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name = $1, email = $2, bio = $3, profile_verse = $4, profile_pic = $5 WHERE id = $6',
      [name, email, bio, profile_verse, profile_pic, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Admin
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const bookCount = await pool.query('SELECT COUNT(*) FROM books');
    const users = await pool.query('SELECT id, username, name, email, is_admin FROM users ORDER BY id ASC');
    const recentActivity = await pool.query(`
      SELECT a.*, u.username 
      FROM activities a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 50
    `);

    res.json({ 
      userCount: parseInt(userCount.rows[0].count),
      bookCount: parseInt(bookCount.rows[0].count),
      allUsers: users.rows,
      recentActivity: recentActivity.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

app.post('/api/books', authenticateToken, bookUpload, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
  const { title, author, release_year, is_trending, is_new, category } = req.body;
  
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (!files || !files['bookFile']) return res.status(400).json({ error: 'Book file is required' });

  try {
    const bookFileUrl = await uploadToSupabase(files['bookFile'][0], 'library');
    let coverFileUrl = null;
    if (files['cover']) {
      coverFileUrl = await uploadToSupabase(files['cover'][0], 'library');
    }

    const result = await pool.query(
      'INSERT INTO books (title, author, release_year, is_trending, is_new, cover_url, file_url, category, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [
        title, 
        author, 
        release_year, 
        is_trending === 'true' || is_trending === true, 
        is_new === 'true' || is_new === true, 
        coverFileUrl, 
        bookFileUrl, 
        category || 'Spiritual', 
        req.user.id
      ]
    );
    
    await logActivity(req.user.id, 'upload', result.rows[0].id, `Uploaded a new book: ${title}`);
    
    res.json({ message: 'Book uploaded', bookId: result.rows[0].id });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload book' });
  }
});

// Bible API Proxy
const BIBLE_API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BIBLE_BASE_URL = 'https://rest.api.bible/v1';

app.get('/api/bible/versions', authenticateToken, async (req, res) => {
  try {
    const response = await fetch(`${BIBLE_BASE_URL}/bibles`, {
      headers: { 'api-key': BIBLE_API_KEY }
    });
    const data = await response.json();
    
    // Filter for specific versions requested by user
    const allowedVersions = ['KJV', 'NKJV', 'AMP', 'ESV', 'NIV', 'NASB', 'NASV', 'Amharic'];
    const filtered = data.data.filter((bible: any) => 
      allowedVersions.includes(bible.abbreviation) || 
      allowedVersions.some(v => bible.name.includes(v)) ||
      bible.language.name === 'Amharic'
    );
    
    res.json(filtered.length > 0 ? filtered : data.data.slice(0, 10)); // Fallback if none found
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Bible versions' });
  }
});

app.get('/api/bible/:bibleId/books', authenticateToken, async (req, res) => {
  try {
    const response = await fetch(`${BIBLE_BASE_URL}/bibles/${req.params.bibleId}/books`, {
      headers: { 'api-key': BIBLE_API_KEY }
    });
    const data = await response.json();
    res.json(data.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.get('/api/bible/:bibleId/books/:bookId/chapters', authenticateToken, async (req, res) => {
  try {
    const response = await fetch(`${BIBLE_BASE_URL}/bibles/${req.params.bibleId}/books/${req.params.bookId}/chapters`, {
      headers: { 'api-key': BIBLE_API_KEY }
    });
    const data = await response.json();
    res.json(data.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

app.get('/api/bible/:bibleId/chapters/:chapterId', authenticateToken, async (req, res) => {
  try {
    const response = await fetch(`${BIBLE_BASE_URL}/bibles/${req.params.bibleId}/chapters/${req.params.chapterId}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`, {
      headers: { 'api-key': BIBLE_API_KEY }
    });
    const data = await response.json();
    res.json(data.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chapter content' });
  }
});

app.get('/api/user/bible-data', authenticateToken, async (req, res) => {
  try {
    const highlights = await pool.query('SELECT * FROM highlights WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    const prayers = await pool.query('SELECT * FROM prayers WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ highlights: highlights.rows, prayers: prayers.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user Bible data' });
  }
});

app.post('/api/highlights', authenticateToken, async (req, res) => {
  const { verseRef, content, color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO highlights (user_id, verse_ref, content, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, verseRef, content, color]
    );
    await logActivity(req.user.id, 'highlight', result.rows[0].id, `Highlighted ${verseRef}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save highlight' });
  }
});

app.delete('/api/highlights/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM highlights WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    await pool.query('DELETE FROM activities WHERE action_type = $1 AND target_id = $2 AND user_id = $3', ['highlight', req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete highlight' });
  }
});

app.post('/api/prayers', authenticateToken, async (req, res) => {
  const { verseRef, note } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO prayers (user_id, verse_ref, note) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, verseRef, note]
    );
    await logActivity(req.user.id, 'prayer', result.rows[0].id, `Added a prayer note for ${verseRef}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save prayer' });
  }
});

app.post('/api/bookmarks', authenticateToken, async (req, res) => {
  const { targetType, targetId, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO bookmarks (user_id, target_type, target_id, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, targetType, targetId, description]
    );
    await logActivity(req.user.id, 'bookmark', result.rows[0].id, `Bookmarked ${description || targetId}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
});

app.post('/api/quotes', authenticateToken, async (req, res) => {
  const { content, author, source } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO quotes (user_id, content, author, source) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, content, author, source]
    );
    await logActivity(req.user.id, 'quote', result.rows[0].id, `Saved a quote from ${source}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save quote' });
  }
});

app.get('/api/bible/verse', async (req, res) => {
  const { reference } = req.query;
  const BIBLE_API_KEY = process.env.BIBLE_API_KEY;
  if (!BIBLE_API_KEY) return res.status(500).json({ error: 'Bible API key not configured' });

  try {
    // Example using API.Bible or similar
    // For now, returning a mock or using a public API if possible
    // Let's use a public one for the demo if no key is provided
    const response = await fetch(`https://bible-api.com/${reference}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verse' });
  }
});

// Socials
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, u.name, u.profile_pic,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
  const { content, image_url, type } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO posts (user_id, content, image_url, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, content, image_url, type]
    );
    await logActivity(req.user.id, 'post', result.rows[0].id, `Shared a new ${type}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await pool.query('SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.id, id]);
    if (exists.rows.length > 0) {
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.id, id]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [req.user.id, id]);
      await logActivity(req.user.id, 'like', parseInt(id), 'Liked a post');
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Action failed' });
  }
});

app.get('/api/posts/:id/comments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username, u.name, u.profile_pic
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/posts/:id/comments', authenticateToken, async (req, res) => {
  const { content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, req.params.id, content]
    );
    await logActivity(req.user.id, 'comment', parseInt(req.params.id), 'Commented on a post');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  const { verseRef, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO notes (user_id, verse_ref, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, verseRef, content]
    );
    await logActivity(req.user.id, 'note', result.rows[0].id, `Added a note for ${verseRef}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// Activity
app.get(['/api/activities', '/api/activity'], authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, a.action_type as type, u.username, u.name, u.profile_pic
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = $1 OR a.user_id IN (SELECT id FROM users LIMIT 10) -- Show some global activity too
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.post('/api/activities/log', authenticateToken, async (req, res) => {
  const { type, targetId, description } = req.body;
  try {
    await logActivity(req.user.id, type, targetId, description);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Messages
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  const { otherUserId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC',
      [req.user.id, otherUserId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (other_id) 
        u.id as other_id, 
        u.username, 
        u.name, 
        u.profile_pic,
        m.content as last_message,
        m.created_at as last_message_time
      FROM users u
      JOIN messages m ON (m.sender_id = u.id AND m.receiver_id = $1) OR (m.sender_id = $1 AND m.receiver_id = u.id)
      WHERE u.id != $1
      ORDER BY other_id, m.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id as other_id, username, name, profile_pic FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, '')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
