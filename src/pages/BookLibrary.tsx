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
            onClick={() => setSelectedBook(book)}
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
            <p className="text-sm text-primary-400">{book.author}</p>
          </motion.div>
        ))}
      </div>

      {/* Reader Popup */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/80 backdrop-blur-sm p-4"
          >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-primary-900 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Reader Header */}
                <div className="bg-primary-950 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedBook(null)} className="text-white hover:bg-primary-900">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Book className="w-6 h-6" />
                    <div>
                      <h2 className="font-bold">{selectedBook.title}</h2>
                      <p className="text-xs text-primary-400">{selectedBook.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-primary-900 rounded-lg px-2 mr-4">
                      <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(50, z - 10))} className="text-white"><ZoomOut className="w-4 h-4" /></Button>
                      <span className="text-xs w-12 text-center">{zoom}%</span>
                      <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(200, z + 10))} className="text-white"><ZoomIn className="w-4 h-4" /></Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedBook(null)} className="text-white hover:bg-primary-900"><X /></Button>
                  </div>
                </div>

                {/* Reader Content */}
                <div className="flex-1 overflow-y-auto p-12 bg-primary-950">
                  <div 
                    className="max-w-3xl mx-auto bg-primary-900 shadow-sm p-12 rounded-lg font-serif leading-relaxed text-primary-50 border border-primary-800"
                    style={{ fontSize: `${zoom}%` }}
                  >
                    <h1 className="text-3xl font-bold mb-8 text-center">{selectedBook.title}</h1>
                    <p className="whitespace-pre-wrap">
                      {selectedBook.content || "This book's content is currently being digitized. Please check back soon for the full spiritual experience. In the meantime, you can explore other titles in our library or use the Bible reader for your daily meditation."}
                    </p>
                  </div>
                </div>

                {/* Reader Tools */}
                <div className="bg-primary-950 border-t border-white/10 p-4 flex items-center justify-center gap-8">
                  <Button variant="ghost" className="flex flex-col items-center gap-1 text-primary-400 hover:text-white hover:bg-white/10">
                    <Highlighter className="w-5 h-5" /> <span className="text-[10px]">Highlight</span>
                  </Button>
                  <Button variant="ghost" className="flex flex-col items-center gap-1 text-primary-400 hover:text-white hover:bg-white/10">
                    <Bookmark className="w-5 h-5" /> <span className="text-[10px]">Bookmark</span>
                  </Button>
                  <Button variant="ghost" className="flex flex-col items-center gap-1 text-primary-400 hover:text-white hover:bg-white/10">
                    <StickyNote className="w-5 h-5" /> <span className="text-[10px]">Note</span>
                  </Button>
                  <Button variant="ghost" className="flex flex-col items-center gap-1 text-primary-400 hover:text-white hover:bg-white/10">
                    <Quote className="w-5 h-5" /> <span className="text-[10px]">Quote</span>
                  </Button>
                </div>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
