import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input } from '../components/UI';
import { 
  Book, ChevronLeft, ChevronRight, Settings, Highlighter, 
  Bookmark, StickyNote, Heart, Search, Type, Palette, 
  ZoomIn, ZoomOut, X, Menu, Share2, Headphones, Loader2, AlertCircle, Key, Globe, Zap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// --- CONFIG UPDATED FROM DASHBOARD ---
const API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BASE_URL = 'https://rest.api.bible/v1'; // Correct endpoint for your platform version

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
  
  // Data State
  const [bibles, setBibles] = useState<any[]>([]);
  const [selectedBible, setSelectedBible] = useState<string>(''); 
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [content, setContent] = useState<string>('');
  
  // UI & Usage State
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [fontSize, setFontSize] = useState('lg');
  const [theme, setTheme] = useState('dark');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [sessionRequests, setSessionRequests] = useState(0);

  // --- API HELPER WITH USAGE TRACKING ---
  const fetchWithKey = async (endpoint: string) => {
    // Safety check for Starter Plan limit (5K total, monitoring session here)
    if (sessionRequests > 100) {
      console.warn("High session usage detected. Consider your 5,000 monthly limit.");
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { 
          'api-key': API_KEY, // Matches dashboard key
          'Accept': 'application/json' 
        }
      });

      setSessionRequests(prev => prev + 1);

      if (!response.ok) {
        const errData = await response.json();
        if (response.status === 401) {
          throw new Error("Bad API Key: Ensure key is 'Active' in dashboard options.");
        }
        throw new Error(errData.message || `Error ${response.status}`);
      }
      return response.json();
    } catch (err: any) {
      throw err;
    }
  };

  // --- INITIAL LOAD: FETCH BIBLES ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setGlobalError(null);
      try {
        const bibleData = await fetchWithKey('/bibles');
        if (bibleData.data && bibleData.data.length > 0) {
          setBibles(bibleData.data);
          // Default to the first available bible (usually KJV or similar on Starter)
          setSelectedBible(bibleData.data[0].id);
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
            setSelectedBook(data.data[0].id);
          }
        } catch (err) { console.error(err); }
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
            setSelectedChapter(data.data[0].id);
          }
        } catch (err) { console.error(err); }
      };
      loadChapters();
    }
  }, [selectedBible, selectedBook]);

  // --- FETCH CONTENT ---
  useEffect(() => {
    if (selectedBible && selectedChapter) {
      const loadContent = async () => {
        setLoading(true);
        try {
          const data = await fetchWithKey(`/bibles/${selectedBible}/chapters/${selectedChapter}?content-type=html`);
          if (data.data) setContent(data.data.content);
        } catch (err) {
          setContent("<div class='text-center py-10 opacity-50'>Chapter unavailable.</div>");
        } finally {
          setLoading(false);
        }
      };
      loadContent();
    }
  }, [selectedBible, selectedChapter]);

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
              {books.find(b => b.id === selectedBook)?.name || 'Reader'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-primary-500 uppercase">
                {bibles.find(b => b.id === selectedBible)?.abbreviation || '---'}
              </span>
              <span className="w-1 h-1 bg-stone-400 rounded-full opacity-30"></span>
              <span className="text-[9px] font-bold opacity-40 uppercase">CH {selectedChapter.split('.').pop()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[8px] font-black uppercase opacity-30">Starter Plan</span>
                <span className="text-[9px] font-bold text-emerald-500">{sessionRequests} Requests</span>
            </div>
            <Button variant="ghost" onClick={() => setShowSettings(true)} className="rounded-full"><Settings /></Button>
        </div>
      </header>

      {/* READER CONTENT */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-12 md:py-20">
        {globalError ? (
          <div className="text-center py-10 flex flex-col items-center gap-8">
            <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center text-red-500"><AlertCircle size={48} /></div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-red-500">Authentication Failed</h2>
              <p className="opacity-60 text-sm max-w-sm mx-auto leading-relaxed">{globalError}</p>
            </div>
            <div className="bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] text-left border border-black/5 w-full max-w-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-500 mb-4">Quick Fix</p>
                <p className="text-xs opacity-80 leading-relaxed mb-4">In your dashboard, click <b>Options</b> next to the key and ensure it is not <b>Disabled</b>. The endpoint is now correctly synced to <b>rest.api.bible</b>.</p>
                <Button onClick={() => window.location.reload()} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-primary-500 text-white">Retry Connection</Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 className="animate-spin w-12 h-12 text-primary-500" />
            <p className="text-[10px] font-black uppercase opacity-30 tracking-[0.4em]">Syncing Library</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className={`bible-content ${currentFontSize.size} font-serif leading-relaxed selection:bg-primary-500/30`} 
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        )}
      </main>

      {/* NAVIGATION DRAWER (Version & Book Switcher) */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-y-0 left-0 w-full max-w-md bg-white dark:bg-[#0c0c0c] z-50 flex flex-col shadow-2xl">
               <div className="p-8 border-b border-black/5 flex justify-between items-center">
                 <h2 className="font-black uppercase tracking-tighter text-2xl italic">Navigation</h2>
                 <Button variant="ghost" onClick={() => setShowNav(false)}><X /></Button>
               </div>
               
               {/* VERSION SWITCHER */}
               <div className="px-8 pt-8">
                 <p className="text-[10px] font-black uppercase opacity-30 tracking-widest mb-4 flex items-center gap-2"><Zap size={12}/> Select Version</p>
                 <div className="grid grid-cols-3 gap-2">
                   {bibles.slice(0, 6).map(b => (
                     <button key={b.id} onClick={() => { setSelectedBible(b.id); setShowNav(false); }} className={`py-3 rounded-xl text-[10px] font-black transition-all ${selectedBible === b.id ? 'bg-primary-500 text-white' : 'bg-black/5 dark:bg-white/5 opacity-60'}`}>
                       {b.abbreviation}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-1 custom-scroll">
                 <p className="text-[10px] font-black uppercase opacity-30 tracking-widest mb-4">Books</p>
                 {books.map(b => (
                   <button key={b.id} onClick={() => { setSelectedBook(b.id); setShowNav(false); }} className={`w-full text-left p-4 rounded-2xl text-sm font-bold transition-all ${selectedBook === b.id ? 'bg-primary-500/10 text-primary-500' : 'hover:bg-black/5 opacity-60'}`}>
                     {b.name}
                   </button>
                 ))}
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
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 inset-x-0 bg-white dark:bg-stone-900 z-50 rounded-t-[3.5rem] p-10 space-y-12">
              <div className="flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tighter">Appearance</h2><Button variant="ghost" onClick={() => setShowSettings(false)}><X /></Button></div>
              <div className="grid grid-cols-4 gap-4">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setTheme(t.id)} className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 ${theme === t.id ? 'border-primary-500 bg-primary-500/5' : 'border-transparent bg-black/5 opacity-60'}`}>
                    <div className={`w-12 h-12 rounded-full ${t.bg} border-2 border-black/10`} />
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between bg-black/5 p-4 rounded-[2.5rem]">
                <Button variant="ghost" className="w-14 h-14 rounded-full" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx > 0) setFontSize(FONT_SIZES[idx-1].id); }}><ZoomOut /></Button>
                <span className="text-xs font-black uppercase tracking-widest">{currentFontSize.label}</span>
                <Button variant="ghost" className="w-14 h-14 rounded-full" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx+1].id); }}><ZoomIn /></Button>
              </div>
              <Button className="w-full h-18 rounded-[2.5rem] font-black uppercase text-sm bg-stone-900 text-white dark:bg-white dark:text-stone-900" onClick={() => setShowSettings(false)}>Update View</Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FOOTER NAVIGATION */}
      <footer className="h-24 border-t border-black/5 flex items-center justify-around px-8 sticky bottom-0 bg-inherit">
         <Button variant="ghost" className="flex flex-col gap-1" onClick={() => {
           const i = chapters.findIndex(c => c.id === selectedChapter);
           if (i > 0) setSelectedChapter(chapters[i-1].id);
         }}><ChevronLeft /><span className="text-[8px] font-black uppercase">Prev</span></Button>
         <div className="h-1 flex-1 max-w-[150px] bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary-500" animate={{ width: `${(chapters.findIndex(c => c.id === selectedChapter) + 1) / (chapters.length || 1) * 100}%` }} />
         </div>
         <Button variant="ghost" className="flex flex-col gap-1" onClick={() => {
           const i = chapters.findIndex(c => c.id === selectedChapter);
           if (i < chapters.length - 1) setSelectedChapter(chapters[i+1].id);
         }}><ChevronRight /><span className="text-[8px] font-black uppercase">Next</span></Button>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .bible-content .v { font-size: 0.6em; vertical-align: super; margin-right: 6px; font-weight: 800; color: #3b82f6; opacity: 0.6; }
        .bible-content p { margin-bottom: 2.5rem; position: relative; }
        .bible-content .s { display: block; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 4rem 0 1.5rem; font-size: 0.8em; opacity: 0.4; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}
