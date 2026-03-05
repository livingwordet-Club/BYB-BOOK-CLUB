import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input } from '../components/UI';
import { 
  Book, ChevronLeft, ChevronRight, Settings, Highlighter, 
  Bookmark, StickyNote, Heart, Search, Type, Palette, 
  ZoomIn, ZoomOut, X, Menu, Share2, Headphones, Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// --- CONFIGURATION ---
const API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BASE_URL = 'https://api.scripture.api.bible/v1';

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
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [bibles, setBibles] = useState<any[]>([]);
  const [selectedBible, setSelectedBible] = useState<string>('de4e12af7f29f59f-02'); 
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
  const [notification, setNotification] = useState<string | null>(null);
  
  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // --- API HELPER ---
  const fetchWithKey = (endpoint: string) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'api-key': API_KEY }
    });
  };

  // --- INITIALIZATION ---
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

  // --- AUTO-SCROLL LOGIC ---
  useEffect(() => {
    if (selectedVerse && contentRef.current && !loading) {
      const timer = setTimeout(() => {
        const el = contentRef.current?.querySelector(`[data-verse-id="${selectedVerse}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('selected');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedVerse, loading, content]);

  // --- DATA FETCHING FUNCTIONS ---
  const fetchBibles = async () => {
    setGlobalError(null);
    try {
      const res = await fetchWithKey('/bibles');
      const data = await res.json();
      if (data.data) {
        setBibles(data.data);
      } else {
        setGlobalError("API Key might be invalid or restricted.");
      }
    } catch (err) {
      setGlobalError("Network error. Please check your internet connection.");
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetchWithKey(`/bibles/${selectedBible}/books`);
      const data = await res.json();
      if (data.data) setBooks(data.data);
    } catch (err) { console.error("Books error:", err); }
  };

  const fetchChapters = async () => {
    try {
      const res = await fetchWithKey(`/bibles/${selectedBible}/books/${selectedBook}/chapters`);
      const data = await res.json();
      if (data.data) setChapters(data.data);
    } catch (err) { console.error("Chapters error:", err); }
  };

  const fetchContent = async () => {
    setLoading(true);
    setSelectedVerse(null); // Clear selection on chapter change
    try {
      const res = await fetchWithKey(`/bibles/${selectedBible}/chapters/${selectedChapter}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true`);
      const data = await res.json();
      if (data.data && data.data.content) {
        setContent(data.data.content);
      }
    } catch (err) {
      setContent('<div class="text-center py-20 opacity-60 italic">Unable to load Scripture content.</div>');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetchWithKey(`/bibles/${selectedBible}/search?query=${encodeURIComponent(searchQuery)}&limit=20`);
      const data = await res.json();
      setSearchResults(data.data?.verses || []);
    } catch (err) { 
      console.error("Search error:", err);
    } finally { 
      setIsSearching(false); 
    }
  };

  const fetchHighlights = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/activity', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await res.json();
      setHighlights(Array.isArray(data) ? data.filter((a: any) => a.type === 'highlight') : []);
    } catch (err) { console.error("Activity error:", err); }
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

  const handleAction = async (type: string, metadata: any = {}) => {
    if (!selectedVerse || !token) return;
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
      setNotification(`${type.toUpperCase()} SAVED`);
      setTimeout(() => setNotification(null), 3000);
      if (type !== 'highlight') setSelectedVerse(null);
    } catch (err) { console.error("Action save error:", err); }
  };

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[1];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} ${currentTheme.text}`}>
      
      {/* NOTIFICATIONS */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-8 py-3 rounded-full shadow-2xl z-50 text-xs font-black tracking-widest"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-opacity-80 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-6 h-20">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => setShowNav(true)} className="hover:scale-110 transition-transform">
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">
              {books.find(b => b.id === selectedBook)?.name || 'Loading...'}
            </h1>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">
              Chapter {chapters.find(c => c.id === selectedChapter)?.number || '1'} • {bibles.find(b => b.id === selectedBible)?.abbreviation || 'KJV'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/audiobooks')} className="rounded-full w-10 h-10 p-0">
            <Headphones className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="rounded-full w-10 h-10 p-0">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* MAIN READER */}
      <main className="flex-1 flex flex-col items-center relative overflow-x-hidden">
        <div className="max-w-3xl w-full px-8 py-16 md:py-24">
          {globalError ? (
            <div className="flex flex-col items-center justify-center py-40 gap-8 text-center animate-in fade-in duration-700">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black uppercase tracking-widest">Connection Error</h3>
                <p className="text-sm opacity-50 max-w-xs mx-auto font-medium">{globalError}</p>
              </div>
              <Button onClick={fetchBibles} variant="outline" className="rounded-full px-10 border-2">Retry Connection</Button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-14 h-14 border-t-4 border-primary-500 rounded-full"
              />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Illuminating the Text</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`bible-content ${currentFontSize.size} leading-[1.8] font-serif`}
              ref={contentRef} 
              onClick={handleVerseClick} 
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          )}
        </div>

        {/* VERSE SELECTION TOOLBAR */}
        <AnimatePresence>
          {selectedVerse && (
            <motion.div 
              initial={{ y: 150, opacity: 0, x: '-50%' }} 
              animate={{ y: 0, opacity: 1, x: '-50%' }} 
              exit={{ y: 150, opacity: 0, x: '-50%' }}
              className="fixed bottom-10 left-1/2 w-[92%] max-w-xl bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-black/5 dark:border-white/10 p-8 z-50"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">Selected Passage</span>
                  <span className="text-sm font-bold opacity-40">Verse {selectedVerse.split('.').pop()}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVerse(null)} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                <ToolButton icon={Highlighter} label="Mark" color="text-yellow-500" onClick={() => handleAction('highlight', { color: 'yellow' })} />
                <ToolButton icon={Bookmark} label="Save" color="text-blue-500" onClick={() => handleAction('bookmark')} />
                <ToolButton icon={StickyNote} label="Note" color="text-green-500" onClick={() => handleAction('note')} />
                <ToolButton icon={Heart} label="Pray" color="text-red-500" onClick={() => handleAction('prayer')} />
              </div>

              <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/5 flex gap-3">
                <Button className="flex-1 h-14 rounded-2xl gap-3 font-bold text-xs uppercase tracking-widest"><Share2 className="w-4 h-4" /> Share Verse</Button>
                <Button variant="outline" className="flex-1 h-14 rounded-2xl gap-3 font-bold text-xs uppercase tracking-widest border-2"><Book className="w-4 h-4" /> Compare</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* NAVIGATION DRAWER */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50" />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-full max-w-md bg-white dark:bg-[#0a0a0a] z-50 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b dark:border-white/5 flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Scripture Index</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowNav(false)} className="rounded-full"><X /></Button>
              </div>
              
              <div className="p-6">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                  <input 
                    type="text" 
                    placeholder="Search keywords (e.g. 'Faith')..." 
                    value={searchQuery}
                    className="w-full bg-black/5 dark:bg-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none border-2 border-transparent focus:border-primary-500/50 transition-all"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary-500" />}
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {searchResults.length > 0 ? (
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Search Results</p>
                      <button onClick={() => setSearchResults([])} className="text-[10px] text-primary-500 font-black uppercase">Clear All</button>
                    </div>
                    {searchResults.map((r: any) => (
                      <button key={r.id} className="w-full text-left p-5 rounded-3xl bg-black/5 dark:bg-white/5 hover:bg-primary-500/10 transition-all group"
                        onClick={() => { setSelectedBook(r.bookId); setSelectedChapter(r.chapterId); setSelectedVerse(r.id); setShowNav(false); }}>
                        <p className="text-[10px] font-black text-primary-500 mb-2 uppercase tracking-widest">{r.reference}</p>
                        <p className="text-sm opacity-70 italic leading-relaxed font-serif line-clamp-3 group-hover:opacity-100">"{r.text.replace(/<[^>]*>/g, '')}"</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="w-[80px] border-r dark:border-white/5 overflow-y-auto p-2 space-y-2 no-scrollbar">
                      {bibles.map(b => (
                        <button key={b.id} onClick={() => setSelectedBible(b.id)} className={`w-full aspect-square flex items-center justify-center rounded-2xl text-[10px] font-black transition-all ${selectedBible === b.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'hover:bg-black/5 opacity-40'}`}>{b.abbreviation}</button>
                      ))}
                    </div>
                    <div className="flex-1 border-r dark:border-white/5 overflow-y-auto p-4 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-20 mb-4 px-2">Books</p>
                      {books.map(b => (
                        <button key={b.id} onClick={() => setSelectedBook(b.id)} className={`w-full text-left p-3 rounded-xl text-sm font-bold transition-all ${selectedBook === b.id ? 'bg-primary-500/10 text-primary-500' : 'hover:bg-black/5 opacity-60'}`}>{b.name}</button>
                      ))}
                    </div>
                    <div className="w-[100px] overflow-y-auto p-4 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-20 mb-4 px-2">CH</p>
                      {chapters.map(c => (
                        <button key={c.id} onClick={() => { setSelectedChapter(c.id); setShowNav(false); }} className={`w-full text-center py-3 rounded-xl text-sm font-black transition-all ${selectedChapter === c.id ? 'bg-primary-500 text-white' : 'hover:bg-black/5 opacity-60'}`}>{c.number}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SETTINGS DRAWER */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-white dark:bg-stone-900 z-50 rounded-t-[3rem] shadow-2xl p-10 space-y-10"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Typography</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="rounded-full"><X /></Button>
              </div>

              <div className="space-y-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-3"><Palette className="w-4 h-4" /> Visual Mode</p>
                <div className="grid grid-cols-4 gap-4">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)} className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${theme === t.id ? 'border-primary-500 bg-primary-500/5 scale-105' : 'border-transparent bg-black/5 dark:bg-white/5 opacity-60'}`}>
                      <div className={`w-10 h-10 rounded-full ${t.bg} border-2 border-black/10`} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-3"><Type className="w-4 h-4" /> Content Scale</p>
                <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-3 rounded-[2rem]">
                  <Button variant="ghost" className="w-14 h-14 rounded-full" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx > 0) setFontSize(FONT_SIZES[idx-1].id); }}>
                    <ZoomOut className="w-6 h-6" />
                  </Button>
                  <span className="text-sm font-black uppercase tracking-widest">{currentFontSize.label}</span>
                  <Button variant="ghost" className="w-14 h-14 rounded-full" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx+1].id); }}>
                    <ZoomIn className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full h-16 text-sm font-black uppercase tracking-[0.3em] rounded-3xl" onClick={() => setShowSettings(false)}>Apply Settings</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FOOTER NAVIGATION */}
      <footer className="sticky bottom-0 z-40 backdrop-blur-xl bg-opacity-90 border-t border-black/5 dark:border-white/5 flex items-center justify-around h-20 px-8">
        <Button variant="ghost" className="flex flex-col items-center gap-1 group" onClick={() => { const i = chapters.findIndex(c => c.id === selectedChapter); if (i > 0) setSelectedChapter(chapters[i-1].id); }}>
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Previous</span>
        </Button>
        
        <div className="flex-1 max-w-[180px] px-6">
          <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
              initial={{ width: 0 }} 
              animate={{ width: `${(chapters.findIndex(c => c.id === selectedChapter) + 1) / (chapters.length || 1) * 100}%` }}
              transition={{ type: 'spring', bounce: 0, duration: 1 }}
            />
          </div>
        </div>

        <Button variant="ghost" className="flex flex-col items-center gap-1 group" onClick={() => { const i = chapters.findIndex(c => c.id === selectedChapter); if (i < chapters.length - 1) setSelectedChapter(chapters[i+1].id); }}>
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Following</span>
        </Button>
      </footer>

      {/* CONTENT STYLING INJECTION */}
      <style dangerouslySetInnerHTML={{ __html: `
        .bible-content p { margin-bottom: 2rem; position: relative; }
        .bible-content .s { font-weight: 900; font-size: 1.2em; display: block; margin: 3rem 0 1.5rem; letter-spacing: -0.02em; opacity: 0.9; font-family: sans-serif; text-transform: uppercase; }
        .bible-content .v { font-size: 0.55em; font-weight: 800; vertical-align: super; margin-right: 0.6em; opacity: 0.3; color: var(--primary-color); }
        .bible-content [data-verse-id] { cursor: pointer; border-radius: 8px; padding: 2px 4px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
        .bible-content [data-verse-id]:hover { background: rgba(59, 130, 246, 0.08); }
        .bible-content [data-verse-id].selected { background: rgba(59, 130, 246, 0.15); box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}

// --- SUB-COMPONENTS ---
function ToolButton({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) {
  return (
    <button className="flex flex-col items-center gap-3 group" onClick={onClick}>
      <div className={`w-16 h-16 rounded-[1.5rem] bg-black/5 dark:bg-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:-translate-y-1 group-active:scale-95 ${color}`}>
        <Icon className="w-7 h-7" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 group-hover:opacity-100 transition-opacity">{label}</span>
    </button>
  );
}
