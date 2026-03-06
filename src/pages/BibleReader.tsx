import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, X, Menu, MessageSquare, BookOpen, 
  ChevronLeft, ChevronRight, Loader2, Bookmark, 
  Quote, PenTool, Heart, Trash2, ZoomIn, ZoomOut,
  Library, Check, Palette, Hand, Mic, Save
} from 'lucide-react';
import { Button } from '../components/UI';
import { useAuth } from '../hooks/useAuth';

// --- CONFIG (Moved inside to prevent build errors) ---
const API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BASE_URL = 'https://rest.api.bible/v1'; 
const APP_SLOGAN = "The Word is Living and Active";

const HIGHLIGHT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
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
  const [bookmarks, setBookmarks] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_bookmarks') || '[]'));
  const [highlights, setHighlights] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_highlights') || '[]'));
  const [prayers, setPrayers] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_prayers') || '[]'));

  // UI State
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [fontSize, setFontSize] = useState('lg');
  
  // Functional Pop-up State
  const [activeVerse, setActiveVerse] = useState<{number: string, text: string, x: number, y: number} | null>(null);
  const [showPrayerRecorder, setShowPrayerRecorder] = useState(false);
  const [prayerNote, setPrayerNote] = useState('');

  useEffect(() => {
    localStorage.setItem('lv_bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('lv_highlights', JSON.stringify(highlights));
    localStorage.setItem('lv_prayers', JSON.stringify(prayers));
  }, [bookmarks, highlights, prayers]);

  const fetchApi = async (path: string) => {
    const res = await fetch(`${BASE_URL}${path}`, { headers: { 'api-key': API_KEY } });
    return res.json();
  };

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

  useEffect(() => {
    if (selectedBible) {
      fetchApi(`/bibles/${selectedBible}/books`).then(d => {
        setBooks(d.data);
        if (d.data.length > 0) setSelectedBook(d.data[0].id);
      });
    }
  }, [selectedBible]);

  useEffect(() => {
    if (selectedBible && selectedBook) {
      fetchApi(`/bibles/${selectedBible}/books/${selectedBook}/chapters`).then(d => {
        setChapters(d.data);
        if (d.data.length > 0) setSelectedChapter(d.data[0].id);
      });
    }
  }, [selectedBible, selectedBook]);

  useEffect(() => {
    if (selectedBible && selectedChapter) {
      setLoading(true);
      fetchApi(`/bibles/${selectedBible}/chapters/${selectedChapter}?content-type=text`)
        .then(d => {
            setContent(d.data.content);
            if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
        })
        .finally(() => setLoading(false));
    }
  }, [selectedBible, selectedChapter]);

  // --- FUNCTIONAL ACTIONS ---
  
  const handleVerseClick = (e: React.MouseEvent, verseNum: string, text: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setActiveVerse({
      number: verseNum,
      text: text,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 80
    });
  };

  const saveHighlight = (color: string) => {
    if (!activeVerse) return;
    const h = { id: Date.now(), ref: `${selectedBook} ${activeVerse.number}`, text: activeVerse.text, color };
    setHighlights([h, ...highlights]);
    setActiveVerse(null);
  };

  const saveBookmark = () => {
    if (!activeVerse) return;
    const b = { id: Date.now(), ref: `${selectedBook} ${activeVerse.number}`, date: new Date().toLocaleDateString() };
    setBookmarks([b, ...bookmarks]);
    setActiveVerse(null);
  };

  const handleSavePrayer = () => {
    const p = { id: Date.now(), ref: activeVerse?.number, note: prayerNote, date: new Date().toLocaleTimeString() };
    setPrayers([p, ...prayers]);
    setShowPrayerRecorder(false);
    setPrayerNote('');
    setActiveVerse(null);
  };

  // Parser to make plain text verses clickable
  const renderVerses = () => {
    const parts = content.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const isVerseNum = part.match(/\[(\d+)\]/);
      if (isVerseNum) {
        const num = isVerseNum[1];
        return (
          <span 
            key={i} 
            onClick={(e) => handleVerseClick(e, num, parts[i+1] || "")}
            className="inline-flex items-center justify-center w-6 h-6 mr-2 text-[10px] font-black bg-blue-600/20 text-blue-400 rounded-md cursor-pointer hover:bg-blue-600 hover:text-white transition-all"
          >
            {num}
          </span>
        );
      }
      return <span key={i} className="verse-text">{part}</span>;
    });
  };

  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[0];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050505] text-stone-300 font-sans">
      
      {/* --- HEADER --- */}
      <nav className="h-20 w-full flex-none flex items-center justify-between px-6 z-[100] border-b border-white/5 bg-[#050505]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowNav(true)} className="rounded-full text-white"><Library size={22} /></Button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">
                {bibles.find(b => b.id === selectedBible)?.abbreviation || 'BIBLE'}
            </span>
            <h2 className="text-sm font-bold text-white">
              {books.find(b => b.id === selectedBook)?.name} {selectedChapter.split('.').pop()}
            </h2>
          </div>
        </div>
        <Button variant="ghost" onClick={() => setShowSettings(true)} className="rounded-full text-white"><Settings size={20} /></Button>
      </nav>

      {/* --- BIBLE CONTENT --- */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto relative custom-scroll px-8 py-12">
        <div className="max-w-2xl mx-auto relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 opacity-20"><Loader2 className="animate-spin mb-4" /> <span className="text-[10px] font-black tracking-widest uppercase">Loading Word</span></div>
          ) : (
            <div className={`${currentFontSize.size} leading-[2.2] font-serif`}>
              {renderVerses()}
            </div>
          )}
        </div>

        {/* --- DYNAMIC VERSE POPUP --- */}
        <AnimatePresence>
          {activeVerse && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              style={{ left: `calc(${activeVerse.x}px - 140px)`, top: `${activeVerse.y}px` }}
              className="fixed z-[500] bg-stone-900 border border-white/10 p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 w-[320px]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Verse {activeVerse.number}</span>
                <button onClick={() => setActiveVerse(null)}><X size={14}/></button>
              </div>

              {/* 10-Color Highlighting Grid */}
              <div className="grid grid-cols-5 gap-2">
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c} onClick={() => saveHighlight(c)} className="w-8 h-8 rounded-full border border-white/5 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowPrayerRecorder(true)} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all">
                  <Hand size={16} className="text-red-500" /> Prayer
                </button>
                <button onClick={saveBookmark} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all">
                  <Bookmark size={16} className="text-blue-500" /> Bookmark
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- PRAYER RECORDER MODAL --- */}
      <AnimatePresence>
        {showPrayerRecorder && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-stone-900 w-full max-w-md p-8 rounded-[3rem] border border-white/10 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black italic">Record Prayer</h3>
                <button onClick={() => setShowPrayerRecorder(false)}><X/></button>
              </div>
              <div className="bg-white/5 p-6 rounded-[2rem] mb-6 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                  <Mic size={24} className="text-red-500" />
                </div>
                <p className="text-[10px] font-black uppercase opacity-40">Voice or Note</p>
                <textarea 
                  value={prayerNote} onChange={(e) => setPrayerNote(e.target.value)}
                  placeholder="Pour your heart out..." 
                  className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-sm placeholder:opacity-20"
                />
              </div>
              <Button onClick={handleSavePrayer} className="w-full bg-blue-600 text-white rounded-2xl py-6 font-black uppercase tracking-widest"><Save size={18} className="mr-2"/> Save to Soul</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FOOTER --- */}
      <footer className="h-20 w-full flex-none flex items-center justify-between px-10 border-t border-white/5 bg-[#050505]">
        <Button variant="ghost" onClick={() => {
            const idx = chapters.findIndex(c => c.id === selectedChapter);
            if (idx > 0) setSelectedChapter(chapters[idx-1].id);
          }} className="text-white"><ChevronLeft size={24} /></Button>
        <div className="flex flex-col items-center">
            <div className="w-32 h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
                <motion.div animate={{ width: `${(chapters.findIndex(c => c.id === selectedChapter) + 1) / chapters.length * 100}%` }} className="h-full bg-blue-500" />
            </div>
            <span className="text-[9px] font-black tracking-[0.4em] opacity-30 uppercase">{APP_SLOGAN}</span>
        </div>
        <Button variant="ghost" onClick={() => {
            const idx = chapters.findIndex(c => c.id === selectedChapter);
            if (idx < chapters.length - 1) setSelectedChapter(chapters[idx+1].id);
          }} className="text-white"><ChevronRight size={24} /></Button>
      </footer>

      {/* --- NAVIGATION DRAWER --- */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/90 z-[400]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-y-0 left-0 w-full max-w-sm bg-stone-950 z-[410] flex flex-col p-8">
                <h2 className="text-3xl font-black italic mb-8">Library</h2>
                <div className="flex-1 overflow-y-auto custom-scroll space-y-2">
                    {books.map(b => (
                        <button key={b.id} onClick={() => { setSelectedBook(b.id); setShowNav(false); }} className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${selectedBook === b.id ? 'bg-blue-600' : 'hover:bg-white/5 opacity-50'}`}>{b.name}</button>
                    ))}
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .verse-text { transition: all 0.2s; cursor: pointer; border-radius: 4px; padding: 2px 0; }
        .verse-text:hover { background: rgba(59, 130, 246, 0.1); }
      `}} />
    </div>
  );
}
