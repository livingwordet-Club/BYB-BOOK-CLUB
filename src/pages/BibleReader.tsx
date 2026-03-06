import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input } from '../components/UI';
import { 
  Book, ChevronLeft, ChevronRight, Settings, Highlighter, 
  Bookmark, StickyNote, Heart, Search, Type, Palette, 
  ZoomIn, ZoomOut, X, Menu, Share2, Headphones, Loader2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// --- CONFIG ---
const API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BASE_URL = 'https://api.scripture.api.bible/v1';

// Versions allowed by your plan
const PREFERRED_VERSIONS = ['NKJV', 'AMP', 'NIV'];

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
  
  // Bible Data State
  const [bibles, setBibles] = useState<any[]>([]);
  const [selectedBible, setSelectedBible] = useState<string>(''); 
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [content, setContent] = useState<string>('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [fontSize, setFontSize] = useState('lg');
  const [theme, setTheme] = useState('dark');
  const [selectedVerse, setSelectedVerse] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // --- API HELPER WITH DEBUGGING ---
  const fetchWithKey = async (endpoint: string) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 
          'api-key': API_KEY, 
          'Accept': 'application/json' 
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("API Error Details:", errData);
        // Specifically catch the "bad api-key" message from the server
        if (response.status === 401 || errData.message?.includes('api-key')) {
          throw new Error("Invalid API Key. Please verify the key in your Bible API dashboard.");
        }
        throw new Error(errData.message || `Server Error: ${response.status}`);
      }
      return response.json();
    } catch (err: any) {
      console.error("Fetch Failure:", err.message);
      throw err;
    }
  };

  // --- INITIAL LOAD: Authorized Bibles ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setGlobalError(null);
      try {
        const bibleData = await fetchWithKey('/bibles');
        if (bibleData.data && bibleData.data.length > 0) {
          const authorized = bibleData.data.filter((b: any) => 
            PREFERRED_VERSIONS.some(p => b.abbreviation.includes(p))
          );
          const list = authorized.length > 0 ? authorized : bibleData.data;
          setBibles(list);
          setSelectedBible(list[0].id);
        }
      } catch (err: any) {
        setGlobalError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // --- FETCH BOOKS ---
  useEffect(() => {
    if (selectedBible) {
      const loadBooks = async () => {
        try {
          const data = await fetchWithKey(`/bibles/${selectedBible}/books`);
          if (data.data) {
            setBooks(data.data);
            if (!selectedBook) setSelectedBook(data.data[0].id);
          }
        } catch (err) { console.error("Books load error:", err); }
      };
      loadBooks();
    }
  }, [selectedBible]);

  // --- FETCH CHAPTERS ---
  useEffect(() => {
    if (selectedBible && selectedBook) {
      const loadChapters = async () => {
        try {
          const data = await fetchWithKey(`/bibles/${selectedBible}/books/${selectedBook}/chapters`);
          if (data.data) {
            setChapters(data.data);
            const exists = data.data.find((c:any) => c.id === selectedChapter);
            if (!exists) setSelectedChapter(data.data[0].id);
          }
        } catch (err) { console.error("Chapters load error:", err); }
      };
      loadChapters();
    }
  }, [selectedBible, selectedBook]);

  // --- FETCH SCRIPTURE CONTENT ---
  useEffect(() => {
    if (selectedBible && selectedChapter) {
      const loadContent = async () => {
        setLoading(true);
        try {
          const data = await fetchWithKey(`/bibles/${selectedBible}/chapters/${selectedChapter}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true`);
          if (data.data) setContent(data.data.content);
        } catch (err) {
          setContent("<div class='text-center py-10 opacity-50'>Scripture content could not be retrieved for this version.</div>");
        } finally {
          setLoading(false);
        }
      };
      loadContent();
    }
  }, [selectedBible, selectedChapter]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const data = await fetchWithKey(`/bibles/${selectedBible}/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.data?.verses || []);
    } catch (err) { console.error("Search failure:", err); }
    finally { setIsSearching(false); }
  };

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[1];

  return (
    <div className={`min-h-screen flex flex-col ${currentTheme.bg} ${currentTheme.text} transition-colors duration-500`}>
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-opacity-80 border-b border-black/5 flex items-center justify-between px-6 h-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowNav(true)} className="rounded-full"><Menu /></Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-widest leading-none mb-1">
              {books.find(b => b.id === selectedBook)?.name || 'Loading...'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold opacity-40">CH {chapters.find(c => c.id === selectedChapter)?.number || '1'}</span>
              <span className="w-1 h-1 bg-primary-500 rounded-full opacity-40"></span>
              <span className="text-[10px] font-black text-primary-500">{bibles.find(b => b.id === selectedBible)?.abbreviation || '---'}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={() => setShowSettings(true)} className="rounded-full"><Settings /></Button>
      </header>

      {/* READER CONTENT */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-12 md:py-20">
        {globalError ? (
          <div className="text-center py-20 flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-tight">Authentication Failed</h2>
              <p className="opacity-60 text-sm max-w-xs mx-auto">{globalError}</p>
            </div>
            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl text-[10px] text-left font-mono max-w-sm">
              <p className="font-bold mb-2">Troubleshooting Steps:</p>
              <ul className="list-disc ml-4 space-y-1 opacity-70">
                <li>Verify key: <strong>{API_KEY}</strong> matches your dashboard.</li>
                <li>Ensure the key is set to "Active" in API.Bible.</li>
                <li>Check for "Referrer" or "IP" restrictions in your settings.</li>
              </ul>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full px-8">Try Reconnecting</Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin w-10 h-10 text-primary-500" />
            <p className="text-[10px] font-black uppercase opacity-30 tracking-[0.3em]">Illuminating the Text</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`bible-content ${currentFontSize.size} font-serif leading-relaxed selection:bg-primary-500/30`} 
            dangerouslySetInnerHTML={{ __html: content }} 
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const v = target.closest('[data-verse-id]');
              if (v) setSelectedVerse(v.getAttribute('data-verse-id'));
            }}
          />
        )}
      </main>

      {/* NAVIGATION DRAWER */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-y-0 left-0 w-full max-w-md bg-white dark:bg-[#121212] z-50 flex flex-col shadow-2xl">
               <div className="p-8 border-b border-black/5 flex justify-between items-center">
                 <h2 className="font-black uppercase tracking-tighter text-xl italic">The Library</h2>
                 <Button variant="ghost" onClick={() => setShowNav(false)}><X /></Button>
               </div>
               
               <div className="p-6 bg-black/5 dark:bg-white/5 mx-6 mt-6 rounded-2xl">
                 <p className="text-[10px] font-black uppercase opacity-30 mb-4 tracking-widest">Select Translation</p>
                 <div className="flex gap-2">
                   {bibles.map(b => (
                     <button key={b.id} onClick={() => setSelectedBible(b.id)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${selectedBible === b.id ? 'bg-primary-500 text-white' : 'bg-white dark:bg-stone-800 opacity-60'}`}>
                       {b.abbreviation}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
                 <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                   <input className="w-full bg-black/5 dark:bg-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none text-sm font-bold" placeholder="Search keywords..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                 </div>

                 <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                   {books.map(b => (
                     <button key={b.id} onClick={() => setSelectedBook(b.id)} className={`w-full text-left p-4 rounded-xl text-sm font-bold transition-all ${selectedBook === b.id ? 'bg-primary-500/10 text-primary-500' : 'hover:bg-black/5 opacity-70'}`}>
                       {b.name}
                     </button>
                   ))}
                 </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SETTINGS DRAWER */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/40 z-50" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 inset-x-0 bg-white dark:bg-stone-900 z-50 rounded-t-[3rem] p-10 space-y-10">
              <div className="flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tighter">Appearance</h2><Button variant="ghost" onClick={() => setShowSettings(false)}><X /></Button></div>
              <div className="space-y-6">
                <p className="text-xs font-black uppercase opacity-30 flex items-center gap-3"><Palette className="w-4 h-4" /> Theme</p>
                <div className="grid grid-cols-4 gap-4">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)} className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 ${theme === t.id ? 'border-primary-500 bg-primary-500/5' : 'border-transparent bg-black/5 opacity-60'}`}>
                      <div className={`w-10 h-10 rounded-full ${t.bg} border-2 border-black/10`} /><span className="text-[10px] font-black uppercase">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-xs font-black uppercase opacity-30 flex items-center gap-3"><Type className="w-4 h-4" /> Text Size</p>
                <div className="flex items-center justify-between bg-black/5 p-3 rounded-[2rem]">
                  <Button variant="ghost" className="w-14 h-14 rounded-full" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx > 0) setFontSize(FONT_SIZES[idx-1].id); }}><ZoomOut /></Button>
                  <span className="text-sm font-black uppercase tracking-widest">{currentFontSize.label}</span>
                  <Button variant="ghost" className="w-14 h-14 rounded-full" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx+1].id); }}><ZoomIn /></Button>
                </div>
              </div>
              <Button className="w-full h-16 text-sm font-black uppercase tracking-[0.3em] rounded-3xl" onClick={() => setShowSettings(false)}>Apply Changes</Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="h-20 border-t border-black/5 flex items-center justify-around px-8 sticky bottom-0 bg-inherit">
         <Button variant="ghost" className="flex flex-col gap-1 items-center" onClick={() => {
           const i = chapters.findIndex(c => c.id === selectedChapter);
           if (i > 0) setSelectedChapter(chapters[i-1].id);
         }}><ChevronLeft size={20} /><span className="text-[8px] font-black uppercase">Prev</span></Button>
         <div className="h-1 flex-1 max-w-[120px] bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary-500" animate={{ width: `${(chapters.findIndex(c => c.id === selectedChapter) + 1) / (chapters.length || 1) * 100}%` }} />
         </div>
         <Button variant="ghost" className="flex flex-col gap-1 items-center" onClick={() => {
           const i = chapters.findIndex(c => c.id === selectedChapter);
           if (i < chapters.length - 1) setSelectedChapter(chapters[i+1].id);
         }}><ChevronRight size={20} /><span className="text-[8px] font-black uppercase">Next</span></Button>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .bible-content .v { font-size: 0.6em; vertical-align: super; margin-right: 6px; font-weight: 800; color: #3b82f6; opacity: 0.6; }
        .bible-content p { margin-bottom: 2rem; position: relative; }
        .bible-content .s { display: block; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 3rem 0 1rem; font-size: 0.8em; opacity: 0.4; }
        .bible-content [data-verse-id] { cursor: pointer; border-radius: 4px; padding: 2px; transition: all 0.2s; }
        .bible-content [data-verse-id]:hover { background: rgba(59, 130, 246, 0.1); }
      `}} />
    </div>
  );
}
