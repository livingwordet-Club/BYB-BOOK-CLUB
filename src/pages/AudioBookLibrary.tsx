import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input } from '../components/UI';
import { useAuth } from '../hooks/useAuth';
import { Headphones, Play, Pause, Search, Clock, User, BookOpen, Volume2, ArrowLeft, SkipBack, SkipForward, X as CloseIcon } from 'lucide-react';

const FEATURED_BOOKS = [
  {
    id: '391',
    title: 'The Confessions of Saint Augustine',
    authors: [{ first_name: 'Saint', last_name: 'Augustine' }],
    totallistenertime: '14:30:00',
    description: 'One of the most influential works in Christian history, this spiritual autobiography describes Augustine\'s journey from a life of sin to his conversion to Christianity.',
    url_librivox: 'https://librivox.org/the-confessions-of-saint-augustine/'
  },
  {
    id: '104',
    title: 'The Pilgrim\'s Progress',
    authors: [{ first_name: 'John', last_name: 'Bunyan' }],
    totallistenertime: '09:15:00',
    description: 'A world-famous Christian allegory that follows the journey of a man named Christian from the "City of Destruction" to the "Celestial City."',
    url_librivox: 'https://librivox.org/the-pilgrims-progress-by-john-bunyan/'
  }
];

export default function AudioBookLibrary() {
  const { token, logout } = useAuth();
  const [books, setBooks] = useState<any[]>(FEATURED_BOOKS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    if (selectedBook) {
      fetchSections(selectedBook.id);
    } else {
      setSections([]);
      setIsPlaying(false);
      setProgress(0);
    }
  }, [selectedBook]);

  useEffect(() => {
    if (audioRef.current && sections[currentSectionIndex]) {
      // Upgrade to https to avoid mixed content blocks
      const url = sections[currentSectionIndex].listen_url.replace('http://', 'https://');
      audioRef.current.src = url;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentSectionIndex, sections]);

  const fetchSections = async (bookId: string) => {
    setLoadingSections(true);
    try {
      const res = await fetch(`/api/audiobooks/${bookId}/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSections(data);
      }
    } catch (err) {
      console.error("Failed to fetch sections:", err);
    } finally {
      setLoadingSections(false);
    }
  };

  const togglePlay = async () => {
    if (audioRef.current) {
      try {
        if (audioRef.current.paused) {
          await audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      } catch (err) {
        console.error("Playback error:", err);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration) {
        const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(p);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audiobooks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        if (data.length > 0) {
          // Filter out duplicates if they exist in featured
          const apiBooks = data.filter(apiB => !FEATURED_BOOKS.some(fB => fB.title === apiB.title));
          setBooks([...FEATURED_BOOKS, ...apiBooks]);
        } else {
          // If API returns empty, just use featured
          setBooks(FEATURED_BOOKS);
        }
      }
    } catch (err) {
      console.error("Audiobook fetch error:", err);
      // Fallback is already set in state (FEATURED_BOOKS)
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.authors?.[0]?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.authors?.[0]?.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8 dark:bg-primary-950">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2 dark:text-primary-50">Audio Library</h1>
            <p className="text-stone-700 dark:text-primary-400">Listen to classic spiritual and literary works.</p>
          </div>
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search audiobooks..."
              className="pl-10 bg-white border-stone-200 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-50"
            />
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-64 bg-stone-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <motion.div
                key={book.id}
                whileHover={{ y: -5 }}
                className="group cursor-pointer"
                onClick={() => setSelectedBook(book)}
              >
                <Card className="h-full overflow-hidden flex flex-col border-stone-200 hover:border-primary-300 transition-colors dark:bg-primary-900 dark:border-primary-800 dark:hover:border-primary-600">
                  <div className="aspect-[3/4] bg-stone-100 relative overflow-hidden dark:bg-primary-950">
                    <img 
                      src={`https://picsum.photos/seed/${book.id}/400/600`} 
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl">
                        <Play className="w-8 h-8 text-primary-600 fill-current ml-1" />
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-stone-700 dark:bg-primary-900/90 dark:text-primary-100">
                      <Clock className="w-3 h-3" /> {book.totallistenertime || 'N/A'}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-stone-900 line-clamp-2 mb-1 group-hover:text-primary-700 transition-colors dark:text-primary-50 dark:group-hover:text-primary-400">
                      {book.title}
                    </h3>
                    <p className="text-sm text-stone-500 flex items-center gap-1 mb-4 dark:text-primary-400">
                      <User className="w-3 h-3" /> {book.authors?.[0]?.first_name} {book.authors?.[0]?.last_name}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">LibriVox</span>
                      <Headphones className="w-4 h-4 text-primary-500" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Audio Player Modal */}
        <AnimatePresence>
          {selectedBook && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedBook(null)}
                className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 dark:bg-primary-900"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/2 aspect-square">
                    <img 
                      src={`https://picsum.photos/seed/${selectedBook.id}/600/600`} 
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="mb-6">
                      <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2 dark:text-primary-50">{selectedBook.title}</h2>
                      <p className="text-primary-700 font-medium dark:text-primary-400">
                        {selectedBook.authors?.[0]?.first_name} {selectedBook.authors?.[0]?.last_name}
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-48 mb-6 pr-2 custom-scrollbar">
                      <p className="text-stone-600 text-sm leading-relaxed dark:text-primary-200">
                        {selectedBook.description?.replace(/<[^>]*>/g, '') || 'No description available for this classic work.'}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {loadingSections ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] text-primary-500 font-bold uppercase tracking-widest">Loading Chapters...</span>
                        </div>
                      ) : sections.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-bold text-primary-500 uppercase mb-2">Chapters</h4>
                          <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                            {sections.map((section, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setCurrentSectionIndex(idx);
                                  setIsPlaying(true);
                                }}
                                className={`w-full text-left text-xs p-2 rounded-lg transition-colors ${
                                  currentSectionIndex === idx 
                                    ? 'bg-primary-500/20 text-primary-400 font-bold' 
                                    : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-primary-800'
                                }`}
                              >
                                {section.title || `Section ${idx + 1}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <audio 
                        ref={audioRef}
                        src={sections[currentSectionIndex]?.listen_url}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => {
                          if (currentSectionIndex < sections.length - 1) {
                            setCurrentSectionIndex(prev => prev + 1);
                          } else {
                            setIsPlaying(false);
                          }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />

                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden dark:bg-primary-800 cursor-pointer" onClick={(e) => {
                        if (audioRef.current) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const p = (e.clientX - rect.left) / rect.width;
                          audioRef.current.currentTime = p * audioRef.current.duration;
                        }
                      }}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-primary-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-widest dark:text-primary-500">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      
                      <div className="flex items-center justify-center gap-6">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-stone-400 hover:text-primary-600"
                          onClick={() => {
                            if (currentSectionIndex > 0) {
                              setCurrentSectionIndex(prev => prev - 1);
                            }
                          }}
                          disabled={currentSectionIndex === 0}
                        >
                          <SkipBack className="w-6 h-6" />
                        </Button>

                        <div 
                          onClick={togglePlay}
                          className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-200 cursor-pointer hover:scale-110 transition-transform dark:shadow-primary-950"
                        >
                          {isPlaying ? (
                            <Pause className="w-8 h-8 text-white fill-current" />
                          ) : (
                            <Play className="w-8 h-8 text-white fill-current ml-1" />
                          )}
                        </div>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-stone-400 hover:text-primary-600"
                          onClick={() => {
                            if (currentSectionIndex < sections.length - 1) {
                              setCurrentSectionIndex(prev => prev + 1);
                            }
                          }}
                          disabled={currentSectionIndex === sections.length - 1}
                        >
                          <SkipForward className="w-6 h-6" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-primary-800">
                        <Button variant="ghost" size="sm" className="text-stone-400 hover:text-primary-600">
                          <Volume2 className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-stone-400 hover:text-primary-600" onClick={() => window.open(selectedBook.url_librivox, '_blank')}>
                          <ExternalLink className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedBook(null)}
                  className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setSelectedBook(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ExternalLink({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
