import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input } from '../components/UI';
import { 
  Book, ChevronLeft, ChevronRight, Settings, Highlighter, 
  Bookmark, StickyNote, Heart, Search, Type, Palette, 
  ZoomIn, ZoomOut, X, Menu, Share2, Headphones
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const THEMES = [
  { id: 'light', bg: 'bg-[#F7F6E5]', text: 'text-stone-900', name: 'Paper' },
  { id: 'sepia', bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]', name: 'Sepia' },
  { id: 'night', bg: 'bg-[#1a1a1a]', text: 'text-stone-300', name: 'Night' },
  { id: 'dark', bg: 'bg-[#050505]', text: 'text-stone-400', name: 'Pure Dark' }
];

const FONT_SIZES = [
  { id: 'sm', size: 'text-sm', label: 'Small' },
  { id: 'base', size: 'text-base', label: 'Normal' },
  { id: 'lg', size: 'text-lg', label: 'Large' },
  { id: 'xl', size: 'text-xl', label: 'Extra Large' },
  { id: '2xl', size: 'text-2xl', label: 'Huge' }
];

export default function BibleReader() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [bibles, setBibles] = useState<any[]>([]);
  const [selectedBible, setSelectedBible] = useState<string>('de4e12af7f29f59f-02'); // Default KJV
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('JHN');
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('JHN.3');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [fontSize, setFontSize] = useState('lg');
  const [theme, setTheme] = useState('dark');
  const [selectedVerse, setSelectedVerse] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBibles();
    fetchHighlights();
  }, []);

  useEffect(() => {
    if (selectedBible) fetchBooks();
  }, [selectedBible]);

  useEffect(() => {
    if (selectedBible && selectedBook) fetchChapters();
  }, [selectedBible, selectedBook]);

  useEffect(() => {
    if (selectedBible && selectedChapter) fetchContent();
  }, [selectedBible, selectedChapter]);

  const fetchBibles = async () => {
    setGlobalError(null);
    try {
      const res = await fetch('/api/bible/versions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) {
        console.error("Bible API Error:", data.error);
        setGlobalError(`Bible API Error: ${data.error}`);
        return;
      }
      if (Array.isArray(data)) {
        setBibles(data);
        if (data.length > 0 && !data.find(b => b.id === selectedBible)) {
          setSelectedBible(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch bibles", err);
      setGlobalError("Failed to connect to Bible service.");
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch(`/api/bible/${selectedBible}/books`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) {
        console.error("Books API Error:", data.error);
        return;
      }
      if (Array.isArray(data)) {
        setBooks(data);
        if (data.length > 0 && !data.find(b => b.id === selectedBook)) {
          setSelectedBook(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch books", err);
    }
  };

  const fetchChapters = async () => {
    try {
      const res = await fetch(`/api/bible/${selectedBible}/books/${selectedBook}/chapters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) {
        console.error("Chapters API Error:", data.error);
        return;
      }
      if (Array.isArray(data)) {
        setChapters(data);
        if (data.length > 0 && !data.find(c => c.id === selectedChapter)) {
          setSelectedChapter(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch chapters", err);
    }
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bible/${selectedBible}/chapters/${selectedChapter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) {
        console.error("Content API Error:", data.error);
        setContent(`<div class="text-center py-20 opacity-60 italic">Failed to load content: ${data.error}</div>`);
        return;
      }
      if (data && data.content) {
        setContent(data.content);
      } else {
        setContent('<div class="text-center py-20 opacity-60 italic">No content available for this chapter.</div>');
      }
    } catch (err) {
      console.error("Failed to fetch content", err);
      setContent('<div class="text-center py-20 opacity-60 italic">An error occurred while fetching content.</div>');
    } finally {
      setLoading(false);
    }
  };

  const fetchHighlights = async () => {
    try {
      const res = await fetch('/api/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setHighlights(Array.isArray(data) ? data.filter((a: any) => a.type === 'highlight') : []);
    } catch (err) {
      console.error("Failed to fetch highlights", err);
    }
  };

  const handleVerseClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const verseSpan = target.closest('[data-verse-id]');
    if (verseSpan) {
      const verseId = verseSpan.getAttribute('data-verse-id');
      setSelectedVerse(verseId === selectedVerse ? null : verseId);
    } else {
      setSelectedVerse(null);
    }
  };

  const [notification, setNotification] = useState<string | null>(null);

  const handleAction = async (type: string, metadata: any = {}) => {
    if (!selectedVerse) return;
    
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          content: `Verse ${selectedVerse.split('.').pop()}`,
          metadata: { 
            ...metadata,
            bibleId: selectedBible,
            bookId: selectedBook,
            chapterId: selectedChapter,
            verseId: selectedVerse 
          }
        })
      });
      fetchHighlights();
      setNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} saved!`);
      setTimeout(() => setNotification(null), 3000);
      if (type !== 'highlight') {
        setSelectedVerse(null);
      }
    } catch (err) {
      console.error(`Failed to save ${type}`, err);
    }
  };

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[1];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} ${currentTheme.text}`}>
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-6 py-2 rounded-full shadow-lg z-50 text-sm font-bold"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-opacity-80 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setShowNav(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold uppercase tracking-widest">
              {books.find(b => b.id === selectedBook)?.name || 'Bible'}
            </h1>
            <p className="text-[10px] opacity-60">
              {chapters.find(c => c.id === selectedChapter)?.number || '1'} • {bibles.find(b => b.id === selectedBible)?.abbreviation || 'KJV'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/audiobooks')}>
            <Headphones className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Reader Area */}
      <main className="flex-1 flex flex-col items-center relative">
        <div className="max-w-3xl w-full px-6 py-12 md:py-20">
          {globalError ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Something went wrong</h3>
                <p className="text-sm opacity-60 max-w-xs mx-auto">{globalError}</p>
              </div>
              <Button onClick={fetchBibles} variant="outline">Try Again</Button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">Opening the Word...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bible-content ${currentFontSize.size} leading-relaxed font-serif`}
              ref={contentRef}
              onClick={handleVerseClick}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>

        {/* Verse Selection Tools */}
        <AnimatePresence>
          {selectedVerse && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white dark:bg-stone-900 rounded-[2rem] shadow-2xl border border-black/5 dark:border-white/10 p-6 z-50"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold uppercase tracking-widest opacity-40">Verse {selectedVerse.split('.').pop()}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVerse(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <ToolButton icon={Highlighter} label="Highlight" color="text-yellow-500" onClick={() => handleAction('highlight', { color: 'yellow' })} />
                <ToolButton icon={Bookmark} label="Bookmark" color="text-blue-500" onClick={() => handleAction('bookmark')} />
                <ToolButton icon={StickyNote} label="Note" color="text-green-500" onClick={() => handleAction('note')} />
                <ToolButton icon={Heart} label="Pray" color="text-red-500" onClick={() => handleAction('prayer')} />
              </div>

              <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex gap-2">
                <Button className="flex-1 gap-2"><Share2 className="w-4 h-4" /> Share</Button>
                <Button variant="outline" className="flex-1 gap-2"><Book className="w-4 h-4" /> Compare</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Drawer */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNav(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-full max-w-sm bg-white dark:bg-stone-900 z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b dark:border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold">Bible Navigation</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowNav(false)}><X /></Button>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Versions Column */}
                <div className="w-1/3 border-r dark:border-white/5 overflow-y-auto p-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 p-2">Versions</p>
                  {bibles.slice(0, 20).map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBible(b.id)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${selectedBible === b.id ? 'bg-primary-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      {b.abbreviation}
                    </button>
                  ))}
                </div>

                {/* Books Column */}
                <div className="w-1/3 border-r dark:border-white/5 overflow-y-auto p-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 p-2">Books</p>
                  {books.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBook(b.id)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${selectedBook === b.id ? 'bg-primary-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>

                {/* Chapters Column */}
                <div className="w-1/3 overflow-y-auto p-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 p-2">Chapters</p>
                  {chapters.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedChapter(c.id);
                        setShowNav(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${selectedChapter === c.id ? 'bg-primary-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      {c.number}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 inset-x-0 bg-white dark:bg-stone-900 z-50 rounded-t-[2.5rem] shadow-2xl p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Reader Settings</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}><X /></Button>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Theme
                </p>
                <div className="grid grid-cols-4 gap-4">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${theme === t.id ? 'border-primary-500 bg-primary-500/10' : 'border-transparent bg-black/5 dark:bg-white/5'}`}
                    >
                      <div className={`w-8 h-8 rounded-full ${t.bg} border border-black/10`} />
                      <span className="text-[10px] font-bold">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                  <Type className="w-4 h-4" /> Text Size
                </p>
                <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-2 rounded-2xl">
                  <Button variant="ghost" onClick={() => {
                    const idx = FONT_SIZES.findIndex(f => f.id === fontSize);
                    if (idx > 0) setFontSize(FONT_SIZES[idx-1].id);
                  }}>
                    <ZoomOut className="w-5 h-5" />
                  </Button>
                  <span className="text-sm font-bold">{currentFontSize.label}</span>
                  <Button variant="ghost" onClick={() => {
                    const idx = FONT_SIZES.findIndex(f => f.id === fontSize);
                    if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx+1].id);
                  }}>
                    <ZoomIn className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full h-14 text-lg rounded-2xl" onClick={() => setShowSettings(false)}>
                  Done
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <footer className="sticky bottom-0 z-40 backdrop-blur-md bg-opacity-80 border-t border-black/5 dark:border-white/5 flex items-center justify-around h-16 px-4">
        <Button 
          variant="ghost" 
          className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100"
          onClick={() => {
            const currentIdx = chapters.findIndex(c => c.id === selectedChapter);
            if (currentIdx > 0) setSelectedChapter(chapters[currentIdx-1].id);
          }}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Prev</span>
        </Button>
        
        <div className="h-1 w-20 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary-500"
            initial={{ width: 0 }}
            animate={{ width: `${(chapters.findIndex(c => c.id === selectedChapter) + 1) / chapters.length * 100}%` }}
          />
        </div>

        <Button 
          variant="ghost" 
          className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100"
          onClick={() => {
            const currentIdx = chapters.findIndex(c => c.id === selectedChapter);
            if (currentIdx < chapters.length - 1) setSelectedChapter(chapters[currentIdx+1].id);
          }}
        >
          <ChevronRight className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Next</span>
        </Button>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .bible-content p { margin-bottom: 1.5rem; }
        .bible-content .v { 
          font-size: 0.6em; 
          font-weight: bold; 
          vertical-align: super; 
          margin-right: 0.3em; 
          opacity: 0.4;
        }
        .bible-content [data-verse-id] {
          cursor: pointer;
          border-radius: 4px;
          padding: 0 2px;
          transition: background 0.2s;
        }
        .bible-content [data-verse-id]:hover {
          background: rgba(var(--primary-rgb), 0.1);
        }
        .bible-content [data-verse-id].selected {
          background: rgba(var(--primary-rgb), 0.2);
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.3);
        }
      `}} />
    </div>
  );
}

function ToolButton({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) {
  return (
    <button className="flex flex-col items-center gap-2 group" onClick={onClick}>
      <div className={`w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center transition-all group-hover:scale-110 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100">{label}</span>
    </button>
  );
}
