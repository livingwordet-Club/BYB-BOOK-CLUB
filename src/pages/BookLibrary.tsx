import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { Book, Search, Filter, ZoomIn, ZoomOut, Highlighter, Bookmark, StickyNote, Quote, X, ArrowLeft } from 'lucide-react';

export default function BookLibrary() {
  const { token, logout } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [zoom, setZoom] = useState(100);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch('/api/books', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setBooks(Array.isArray(data) ? data : []);
        } else if (res.status === 401 || res.status === 403) {
          logout();
        }
      } catch (err) {
        console.error("Failed to fetch books:", err);
      }
    };
    
    if (token) {
      fetchBooks();
    }
  }, [token]);

  const saveActivity = async (type: string, content: string, metadata: any = {}) => {
    if (!selectedBook) return;
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          content,
          metadata: { 
            ...metadata, 
            bookId: selectedBook.id, 
            bookTitle: selectedBook.title,
            source: 'library'
          }
        })
      });
    } catch (err) {
      console.error(`Failed to save ${type}:`, err);
    }
  };

  const handleBookSelect = (book: any) => {
    saveActivity('read', `Started reading ${book.title}`);
    window.open(book.file_url, '_blank');
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-50">Spiritual Library</h1>
          <p className="text-primary-400">Explore our collection of wisdom</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 w-4 h-4" />
            <Input 
              className="pl-10 w-64 bg-primary-900 border-primary-800 text-primary-50" 
              placeholder="Search books or authors..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredBooks.map(book => (
          <motion.div
            key={book.id}
            whileHover={{ y: -10 }}
            onClick={() => handleBookSelect(book)}
            className="cursor-pointer group"
          >
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-lg mb-3">
              <img 
                src={book.cover_url || 'https://picsum.photos/seed/spiritual/300/450'} 
                alt={book.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <Button variant="primary" size="sm" className="w-full">Read Book</Button>
              </div>
            </div>
            <h3 className="font-bold text-primary-50 truncate">{book.title}</h3>
            <div className="flex items-center justify-between">
              <p className="text-sm text-primary-400">{book.author}</p>
              {book.release_year && <p className="text-xs text-primary-500">{book.release_year}</p>}
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
