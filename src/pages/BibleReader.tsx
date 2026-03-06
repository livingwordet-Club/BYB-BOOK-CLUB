import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, X, Menu, MessageSquare, BookOpen, 
  ChevronLeft, ChevronRight, Loader2, Bookmark, 
  Quote, PenTool, Heart, Trash2, ZoomIn, ZoomOut,
  Library, Check, Palette
} from 'lucide-react';
import { Button } from '../components/UI';
import { useAuth } from '../hooks/useAuth';

// --- CONFIG ---
const API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BASE_URL = 'https://rest.api.bible/v1'; 

// 10 Variation Color Palette for Highlighting
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
  const [activeModal, setActiveModal] = useState<'prayer' | 'quote' | null>(null);
  const [modalInput, setModalInput] = useState('');
  
  // Selection/Highlight State
  const [selectionRange, setSelectionRange] = useState<{text: string, x: number, y: number} | null>(null);

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

  // Handle Text Selection for Highlighting
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 1) {
      const rect = selection?.getRangeAt(0).getBoundingClientRect();
      if (rect) {
        setSelectionRange({
          text,
          x: rect.left + (rect.width / 2),
          y: rect.top + window.scrollY - 10
        });
      }
    } else {
      setSelectionRange(null);
    }
  };

  const applyHighlight = (color: string) => {
    if (!selectionRange) return;
    const newHighlight = {
      id: Date.now(),
      ref: `${books.find(b => b.id === selectedBook)?.name} ${selectedChapter.split('.').pop()}`,
      text: selectionRange.text,
      color: color,
      date: new Date().toLocaleDateString()
    };
    setHighlights([newHighlight, ...highlights]);
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  };

  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[0];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050505] text-stone-400 transition-colors duration-300 font-sans">
      
      {/* --- DYNAMIC HEADER --- */}
      <nav className="h-20 w-full flex-none flex items-center justify-between px-6 z-[100] border-b border-white/5 bg-[#050505]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowNav(true)} className="rounded-full text-white">
            <Library size={22} />
          </Button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">
                {bibles.find(b => b.id === selectedBible)?.abbreviation || 'BIBLE'}
            </span>
            <h2 className="text-sm font-bold truncate max-w-[150px] text-white">
              {books.find(b => b.id === selectedBook)?.name || '...'} {selectedChapter.split('.').pop()}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setView(view === 'reader' ? 'journal' : 'reader')} className="rounded-full text-white">
            {view === 'reader' ? <MessageSquare size={20}/> : <BookOpen size={20}/>}
          </Button>
          <Button variant="ghost" onClick={() => setShowSettings(true)} className="rounded-full text-white">
            <Settings size={20} />
          </Button>
        </div>
      </nav>

      {/* --- MAIN SCROLLABLE AREA --- */}
      <main 
        ref={scrollContainerRef} 
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scroll"
      >
        {/* Floating Highlighting Palette */}
        <AnimatePresence>
          {selectionRange && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ left: `${selectionRange.x}px`, top: `${selectionRange.y - 60}px`, transform: 'translateX(-50%)' }}
              className="fixed z-[300] bg-stone-900 border border-white/20 p-2 rounded-2xl shadow-2xl flex gap-1 items-center"
            >
              {HIGHLIGHT_COLORS.map(color => (
                <button 
                  key={color} 
                  onClick={() => applyHighlight(color)}
                  className="w-6 h-6 rounded-full border border-white/10 hover:scale-125 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="w-px h-4 bg-white/10 mx-1" />
              <Button variant="ghost" onClick={() => setSelectionRange(null)} className="p-1 h-auto rounded-lg"><X size={14}/></Button>
            </motion.div>
          )}
        </AnimatePresence>

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
                  className={`bible-content-render ${currentFontSize.size} leading-[1.8] font-serif select-text text-stone-300`}
                  dangerouslySetInnerHTML={{ __html: content }} 
                />
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h3 className="text-5xl font-black tracking-tighter italic mb-12 text-white">Journal</h3>
               <div className="space-y-4">
                 {highlights.map(h => (
                   <div key={h.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex justify-between items-start">
                     <div>
                       <div className="flex items-center gap-2 mb-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.color }} />
                         <p className="text-[10px] font-black uppercase text-blue-500">{h.ref}</p>
                       </div>
                       <p className="text-sm italic opacity-70">"{h.text}"</p>
                     </div>
                     <Button variant="ghost" onClick={() => setHighlights(highlights.filter(x => x.id !== h.id))} className="text-red-500/50 hover:text-red-500">
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
      <footer className="h-20 w-full flex-none flex items-center justify-between px-10 z-[100] border-t border-white/5 bg-[#050505] shadow-2xl">
        <Button variant="ghost" disabled={loading} onClick={() => {
            const idx = chapters.findIndex(c => c.id === selectedChapter);
            if (idx > 0) setSelectedChapter(chapters[idx-1].id);
          }} className="rounded-2xl hover:bg-white/5 px-6 text-white">
          <ChevronLeft size={24} />
        </Button>
        <div className="flex flex-col items-center">
            <div className="w-32 h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
                <motion.div animate={{ width: `${(chapters.findIndex(c => c.id === selectedChapter) + 1) / chapters.length * 100}%` }} className="h-full bg-blue-500" />
            </div>
            <span className="text-[9px] font-black tracking-[0.4em] opacity-30 uppercase">Progress</span>
        </div>
        <Button variant="ghost" disabled={loading} onClick={() => {
            const idx = chapters.findIndex(c => c.id === selectedChapter);
            if (idx < chapters.length - 1) setSelectedChapter(chapters[idx+1].id);
          }} className="rounded-2xl hover:bg-white/5 px-6 text-white">
          <ChevronRight size={24} />
        </Button>
      </footer>

      {/* --- NAVIGATION OVERLAY --- */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[400]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed inset-y-0 left-0 w-full max-w-sm bg-stone-950 z-[410] flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-2xl font-black italic tracking-tighter text-white">Library</h2>
                    <Button variant="ghost" onClick={() => setShowNav(false)} className="rounded-full text-white"><X/></Button>
                </div>
                <div className="p-6">
                    <label className="text-[10px] font-black uppercase opacity-30 mb-2 block text-white/50">Select Version</label>
                    <select value={selectedBible} onChange={(e) => setSelectedBible(e.target.value)} className="w-full bg-stone-900 text-white border border-white/20 p-4 rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                        {bibles.map(b => <option key={b.id} value={b.id} className="bg-stone-900 text-white">{b.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-1 custom-scroll">
                    <label className="text-[10px] font-black uppercase opacity-30 mb-4 block text-white/50">Books of the Bible</label>
                    {books.map(b => (
                        <button key={b.id} onClick={() => { setSelectedBook(b.id); setShowNav(false); }} className={`w-full text-left p-4 rounded-2xl text-sm font-bold transition-all ${selectedBook === b.id ? 'bg-blue-600 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>{b.name}</button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/40 z-[400]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 inset-x-0 bg-stone-900 text-white p-10 rounded-t-[4rem] z-[410] border-t border-white/10 shadow-2xl">
                <div className="max-w-xl mx-auto">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="font-black uppercase tracking-widest text-xs">Scripture Tools</h4>
                        <Button variant="ghost" onClick={() => setShowSettings(false)}><X /></Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-12">
                        {[
                            { icon: <Bookmark />, label: 'BOOKMARK', color: 'text-blue-500', action: () => { setBookmarks([{id:Date.now(), ref:selectedChapter, text:'Chapter Bookmark', date:new Date().toLocaleDateString()}, ...bookmarks]); setShowSettings(false); } },
                            { icon: <Quote />, label: 'SAVE QUOTE', color: 'text-purple-500', action: () => setActiveModal('quote') },
                            { icon: <Heart />, label: 'PRAYER', color: 'text-red-500', action: () => setActiveModal('prayer') }
                        ].map((tool, i) => (
                            <button key={i} onClick={tool.action} className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-[2.5rem] hover:scale-105 active:scale-95 transition-all">
                                <span className={tool.color}>{tool.icon}</span>
                                <span className="text-[9px] font-black">{tool.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                        <Button variant="ghost" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx > 0) setFontSize(FONT_SIZES[idx-1].id); }}><ZoomOut/></Button>
                        <span className="text-[10px] font-black uppercase tracking-widest">Adjust Font Size</span>
                        <Button variant="ghost" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx+1].id); }}><ZoomIn/></Button>
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
        ::selection { background-color: rgba(59, 130, 246, 0.5); color: white; }
      `}} />
    </div>
  );
}
