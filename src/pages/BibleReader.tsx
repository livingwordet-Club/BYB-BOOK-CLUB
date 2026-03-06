import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, X, Menu, MessageSquare, BookOpen, 
  ChevronLeft, ChevronRight, Loader2, Bookmark, 
  Quote, PenTool, Heart, Trash2, ZoomIn, ZoomOut,
  ChevronDown, Search, Library
} from 'lucide-react';
import { Button } from '../components/UI';
import { useAuth } from '../hooks/useAuth';

// --- CONFIG ---
const API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BASE_URL = 'https://rest.api.bible/v1'; 

const THEMES = [
  { id: 'light', bg: 'bg-[#F7F6E5]', text: 'text-stone-900', border: 'border-stone-200' },
  { id: 'sepia', bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]', border: 'border-[#e5dcc3]' },
  { id: 'dark', bg: 'bg-[#050505]', text: 'text-stone-400', border: 'border-white/5' }
];

const FONT_SIZES = [
  { id: 'base', size: 'text-base', label: 'Normal' },
  { id: 'lg', size: 'text-lg', label: 'Large' },
  { id: 'xl', size: 'text-xl', label: 'Extra' }
];

export default function BibleReader() {
  const { token } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Data State
  const [bibles, setBibles] = useState<any[]>([]);
  const [selectedBible, setSelectedBible] = useState<string>(''); 
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [content, setContent] = useState<string>('');
  
  // Storage State
  const [view, setView] = useState<'reader' | 'journal'>('reader');
  const [bookmarks, setBookmarks] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_bookmarks') || '[]'));
  const [highlights, setHighlights] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_highlights') || '[]'));
  const [quotes, setQuotes] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_quotes') || '[]'));
  const [prayers, setPrayers] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_prayers') || '[]'));

  // UI State
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [fontSize, setFontSize] = useState('lg');
  const [theme, setTheme] = useState('dark');
  const [activeModal, setActiveModal] = useState<'prayer' | 'quote' | null>(null);
  const [modalInput, setModalInput] = useState('');

  // Local Storage Sync
  useEffect(() => {
    localStorage.setItem('lv_bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('lv_highlights', JSON.stringify(highlights));
    localStorage.setItem('lv_quotes', JSON.stringify(quotes));
    localStorage.setItem('lv_prayers', JSON.stringify(prayers));
  }, [bookmarks, highlights, quotes, prayers]);

  const fetchApi = async (path: string) => {
    const res = await fetch(`${BASE_URL}${path}`, { headers: { 'api-key': API_KEY } });
    return res.json();
  };

  // 1. Initial Load: Filter for English and Amharic
  useEffect(() => {
    const loadBibles = async () => {
      setLoading(true);
      const data = await fetchApi('/bibles');
      const filtered = data.data.filter((b: any) => b.language.id === 'eng' || b.language.id === 'amh');
      setBibles(filtered);
      if (filtered.length > 0) setSelectedBible(filtered[0].id);
      setLoading(false);
    };
    loadBibles();
  }, []);

  // 2. Load Books
  useEffect(() => {
    if (selectedBible) {
      fetchApi(`/bibles/${selectedBible}/books`).then(d => {
        setBooks(d.data);
        if (d.data.length > 0) setSelectedBook(d.data[0].id);
      });
    }
  }, [selectedBible]);

  // 3. Load Chapters
  useEffect(() => {
    if (selectedBible && selectedBook) {
      fetchApi(`/bibles/${selectedBible}/books/${selectedBook}/chapters`).then(d => {
        setChapters(d.data);
        if (d.data.length > 0) setSelectedChapter(d.data[0].id);
      });
    }
  }, [selectedBible, selectedBook]);

  // 4. Load Content + Reset Scroll
  useEffect(() => {
    if (selectedBible && selectedChapter && view === 'reader') {
      setLoading(true);
      fetchApi(`/bibles/${selectedBible}/chapters/${selectedChapter}?content-type=html`)
        .then(d => {
            setContent(d.data.content);
            if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
        })
        .finally(() => setLoading(false));
    }
  }, [selectedBible, selectedChapter, view]);

  const handleQuickAdd = (type: 'bookmark' | 'highlight') => {
    const selection = window.getSelection()?.toString().trim();
    if (type === 'highlight' && !selection) return alert("Please select text first.");
    const entry = { id: Date.now(), ref: selectedChapter, text: selection || "Chapter Saved", date: new Date().toLocaleDateString() };
    if (type === 'bookmark') setBookmarks([entry, ...bookmarks]);
    else setHighlights([entry, ...highlights]);
  };

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[0];

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${currentTheme.bg} ${currentTheme.text} transition-colors duration-300`}>
      
      {/* --- DYNAMIC HEADER --- */}
      <nav className={`h-20 w-full flex-none flex items-center justify-between px-6 z-[100] border-b ${currentTheme.border} bg-inherit`}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowNav(true)} className="rounded-full hover:bg-white/5">
            <Library size={22} />
          </Button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 leading-none mb-1">
                {bibles.find(b => b.id === selectedBible)?.abbreviation || 'BIBLE'}
            </span>
            <h2 className="text-sm font-bold truncate max-w-[150px]">
              {books.find(b => b.id === selectedBook)?.name || '...'} {selectedChapter.split('.').pop()}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setView(view === 'reader' ? 'journal' : 'reader')} className="rounded-full">
            {view === 'reader' ? <MessageSquare size={20}/> : <BookOpen size={20}/>}
          </Button>
          <Button variant="ghost" onClick={() => setShowSettings(true)} className="rounded-full">
            <Settings size={20} />
          </Button>
        </div>
      </nav>

      {/* --- DYNAMIC CONTENT CONTAINER (Calculated Space) --- */}
      <main 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scroll"
      >
        <div className="max-w-3xl mx-auto px-6 py-12">
          {view === 'reader' ? (
            <div className="w-full">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-30">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Opening Scrolls</p>
                </div>
              ) : (
                <article 
                  className={`bible-content-render ${currentFontSize.size} leading-[1.8] font-serif select-text`}
                  dangerouslySetInnerHTML={{ __html: content }} 
                />
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h3 className="text-5xl font-black tracking-tighter italic mb-12">Journal</h3>
               {/* Simplified Journal List */}
               <div className="space-y-4">
                 {bookmarks.map(b => (
                   <div key={b.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-black uppercase text-blue-500 mb-2">{b.ref}</p>
                       <p className="text-sm italic opacity-70">"{b.text}"</p>
                     </div>
                     <Button variant="ghost" onClick={() => setBookmarks(bookmarks.filter(x => x.id !== b.id))} className="text-red-500/50 hover:text-red-500">
                       <Trash2 size={16}/>
                     </Button>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* --- DYNAMIC FOOTER --- */}
      <footer className={`h-20 w-full flex-none flex items-center justify-between px-10 z-[100] border-t ${currentTheme.border} bg-inherit shadow-2xl`}>
        <Button 
          variant="ghost" 
          disabled={loading}
          onClick={() => {
            const idx = chapters.findIndex(c => c.id === selectedChapter);
            if (idx > 0) setSelectedChapter(chapters[idx-1].id);
          }}
          className="rounded-2xl hover:bg-white/5 px-6"
        >
          <ChevronLeft size={24} />
        </Button>
        
        <div className="flex flex-col items-center">
            <div className="w-32 h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(chapters.findIndex(c => c.id === selectedChapter) + 1) / chapters.length * 100}%` }}
                    className="h-full bg-blue-500"
                />
            </div>
            <span className="text-[9px] font-black tracking-[0.4em] opacity-30 uppercase">Progress</span>
        </div>
        
        <Button 
          variant="ghost" 
          disabled={loading}
          onClick={() => {
            const idx = chapters.findIndex(c => c.id === selectedChapter);
            if (idx < chapters.length - 1) setSelectedChapter(chapters[idx+1].id);
          }}
          className="rounded-2xl hover:bg-white/5 px-6"
        >
          <ChevronRight size={24} />
        </Button>
      </footer>

      {/* --- NAVIGATION OVERLAY (Books & Chapters) --- */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed inset-y-0 left-0 w-full max-w-sm bg-stone-950 z-[210] flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-2xl font-black italic tracking-tighter">Library</h2>
                    <Button variant="ghost" onClick={() => setShowNav(false)} className="rounded-full"><X/></Button>
                </div>
                
                <div className="p-6">
                    <label className="text-[10px] font-black uppercase opacity-30 mb-2 block">Select Translation</label>
                    <select value={selectedBible} onChange={(e) => setSelectedBible(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500">
                        {bibles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-1 custom-scroll">
                    <label className="text-[10px] font-black uppercase opacity-30 mb-4 block">Books of the Bible</label>
                    {books.map(b => (
                        <button 
                            key={b.id} 
                            onClick={() => { setSelectedBook(b.id); setShowNav(false); }}
                            className={`w-full text-left p-4 rounded-2xl text-sm font-bold transition-all ${selectedBook === b.id ? 'bg-blue-600 text-white' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                        >
                            {b.name}
                        </button>
                    ))}
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- SETTINGS & TOOLS DRAWER --- */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/40 z-[200]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`fixed bottom-0 inset-x-0 ${theme === 'dark' ? 'bg-stone-900 text-white' : 'bg-white text-stone-900'} p-10 rounded-t-[4rem] z-[210] border-t border-white/10 shadow-2xl`}>
                <div className="max-w-xl mx-auto">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="font-black uppercase tracking-widest text-xs">Scripture Tools</h4>
                        <Button variant="ghost" onClick={() => setShowSettings(false)}><X /></Button>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-12">
                        {[
                            { icon: <Bookmark />, label: 'SAVE', color: 'text-blue-500', action: () => handleQuickAdd('bookmark') },
                            { icon: <PenTool />, label: 'MARK', color: 'text-amber-500', action: () => handleQuickAdd('highlight') },
                            { icon: <Quote />, label: 'QUOTE', color: 'text-purple-500', action: () => setActiveModal('quote') },
                            { icon: <Heart />, label: 'PRAY', color: 'text-red-500', action: () => setActiveModal('prayer') }
                        ].map((tool, i) => (
                            <button key={i} onClick={() => { tool.action(); setShowSettings(false); }} className="flex flex-col items-center gap-3 p-6 bg-black/5 dark:bg-white/5 rounded-[2.5rem] hover:scale-105 active:scale-95 transition-all">
                                <span className={tool.color}>{tool.icon}</span>
                                <span className="text-[9px] font-black">{tool.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-3">
                            {THEMES.map(t => (
                                <button key={t.id} onClick={() => setTheme(t.id)} className={`flex-1 h-14 rounded-2xl border-4 ${theme === t.id ? 'border-blue-500' : 'border-transparent'} ${t.bg}`} />
                            ))}
                        </div>
                        <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                            <Button variant="ghost" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx > 0) setFontSize(FONT_SIZES[idx-1].id); }}><ZoomOut/></Button>
                            <span className="text-[10px] font-black uppercase tracking-widest">{currentFontSize.label}</span>
                            <Button variant="ghost" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx+1].id); }}><ZoomIn/></Button>
                        </div>
                    </div>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .bible-content-render .v { font-size: 0.55em; vertical-align: super; margin-right: 6px; font-weight: 900; color: #3b82f6; opacity: 0.8; }
        .bible-content-render p { margin-bottom: 2rem; position: relative; }
        .bible-content-render .s { display: block; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; margin: 4rem 0 1.5rem; font-size: 0.75em; opacity: 0.4; text-align: center; }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(125,125,125,0.2); border-radius: 20px; }
      `}} />
    </div>
  );
}
