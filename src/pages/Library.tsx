import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { Book, Search, Filter, Download, ExternalLink, BookOpen, Headphones, Play, Pause, Volume2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useNavigate } from 'react-router-dom';

interface BookData {
  id: number | string;
  title: string;
  author: string;
  cover_url: string;
  file_url?: string;
  audio_url?: string;
  category: string;
  type: 'book' | 'audiobook';
  description?: string;
}

export default function Library() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookData[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'book' | 'audiobook'>('All');
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<BookData | null>(null);

  const handleReadBook = async (book: BookData) => {
    if (book.type === 'audiobook') {
      setPlayingAudio(book);
      return;
    }
    
    if (!book.file_url) return;
    
    // Log activity
    try {
      await axios.post('/api/activities/log', {
        type: 'read',
        targetId: typeof book.id === 'number' ? book.id : null,
        description: `Started reading "${book.title}"`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to log reading activity', err);
    }

    navigate(`/reader?url=${encodeURIComponent(book.file_url)}&title=${encodeURIComponent(book.title)}`);
  };

  const fetchLibriVox = async (query: string, category: string): Promise<BookData[]> => {
    try {
      const response = await axios.get(`https://librivox.org/api/feed/audiobooks/?${query}&format=json`);
      if (response.data && response.data.books) {
        return response.data.books.map((b: any) => ({
          id: `lv-${b.id}`,
          title: b.title,
          author: b.authors.map((a: any) => `${a.first_name} ${a.last_name}`).join(', '),
          cover_url: `https://picsum.photos/seed/${b.id}/300/400`, // LibriVox doesn't always provide covers easily
          audio_url: b.url_librivox,
          category: category,
          type: 'audiobook',
          description: b.description
        }));
      }
      return [];
    } catch (err) {
      console.error('LibriVox fetch error', err);
      return [];
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Fetch local books
        const localRes = await axios.get('/api/books', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const localBooks = localRes.data.map((b: any) => ({ ...b, type: 'book' }));

        // Fetch specific classics from LibriVox
        const pilgrimsProgress = await fetchLibriVox('title=^Pilgrim%27s%20Progress', 'Classics');
        const confessions = await fetchLibriVox('title=^Confessions&author=Augustine', 'Classics');
        const generalAudio = await fetchLibriVox('genre=Religion', 'Spiritual');

        setBooks([...localBooks, ...pilgrimsProgress, ...confessions, ...generalAudio]);
      } catch (err) {
        console.error('Failed to fetch library', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase()) || 
                         book.author.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || book.category === category;
    const matchesType = typeFilter === 'All' || book.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const categories = ['All', 'Spiritual', 'Theology', 'Classics', 'History', 'Audiobooks'];

  if (loading) return <div className="p-8 text-center text-primary-600">Loading Library...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-900 dark:text-primary-50">Spiritual Library</h1>
          <p className="text-primary-600 dark:text-primary-400">Explore our collection of spiritual wisdom</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" size={20} />
          <Input 
            placeholder="Search by title or author..." 
            className="pl-12"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={20} className="text-primary-600" />
          <select 
            className="bg-white border border-primary-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-200 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-50"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select 
            className="bg-white border border-primary-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-200 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-50"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="All">All Types</option>
            <option value="book">E-Books</option>
            <option value="audiobook">Audiobooks</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredBooks.map((book) => (
          <Card key={book.id} className="group p-0 overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300">
            <div className="aspect-[3/4] bg-primary-100 relative overflow-hidden dark:bg-primary-800">
              {book.cover_url ? (
                <img 
                  src={book.cover_url} 
                  alt={book.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary-300">
                  <Book size={64} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleReadBook(book)}
                >
                  {book.type === 'audiobook' ? (
                    <><Headphones size={16} /> Listen Now</>
                  ) : (
                    <><BookOpen size={16} /> Read Now</>
                  )}
                </Button>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-500">{book.category}</span>
                {book.type === 'audiobook' && (
                  <span className="bg-amber-100 text-amber-600 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                    <Headphones size={8} /> Audio
                  </span>
                )}
              </div>
              <h3 className="font-bold text-primary-900 dark:text-primary-50 line-clamp-1">{book.title}</h3>
              <p className="text-sm text-primary-600 dark:text-primary-400 mb-4">{book.author}</p>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-primary-50 dark:border-primary-800">
                <button className="text-primary-400 hover:text-primary-600 transition-colors">
                  <Download size={18} />
                </button>
                <button className="text-primary-400 hover:text-primary-600 transition-colors">
                  <ExternalLink size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-20">
          <Book size={48} className="mx-auto text-primary-200 mb-4" />
          <h3 className="text-xl font-bold text-primary-900 dark:text-primary-50">No books found</h3>
          <p className="text-primary-600 dark:text-primary-400">Try adjusting your search or filter</p>
        </div>
      )}
      {/* Audio Player Overlay */}
      <AnimatePresence>
        {playingAudio && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-primary-900 text-white p-6 rounded-3xl shadow-2xl z-50 border border-primary-800"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-primary-800 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={playingAudio.cover_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-sm line-clamp-1">{playingAudio.title}</h4>
                  <p className="text-xs text-primary-400">{playingAudio.author}</p>
                </div>
              </div>
              <button onClick={() => setPlayingAudio(null)} className="text-primary-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6">
                <button className="text-primary-400 hover:text-white"><Play size={24} className="rotate-180" /></button>
                <button className="w-12 h-12 bg-white text-primary-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                  <Play size={24} fill="currentColor" />
                </button>
                <button className="text-primary-400 hover:text-white"><Play size={24} /></button>
              </div>
              
              <div className="space-y-1">
                <div className="h-1 bg-primary-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 w-1/3" />
                </div>
                <div className="flex justify-between text-[10px] text-primary-500">
                  <span>12:45</span>
                  <span>45:00</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-primary-400">
                  <Volume2 size={16} />
                  <div className="w-20 h-1 bg-primary-800 rounded-full">
                    <div className="h-full bg-primary-400 w-2/3" />
                  </div>
                </div>
                <a 
                  href={playingAudio.audio_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] font-bold text-primary-400 hover:text-white flex items-center gap-1"
                >
                  <ExternalLink size={12} /> LibriVox Page
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
