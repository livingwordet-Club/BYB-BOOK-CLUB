import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input } from '../components/UI';
import { 
  Book, ChevronLeft, ChevronRight, Settings, Highlighter, 
  Bookmark, StickyNote, Heart, Search, Type, Palette, 
  ZoomIn, ZoomOut, X, Menu, Share2, Headphones, Loader2, 
  AlertCircle, Key, Globe, Zap, Quote, PenTool, MessageSquare,
  BookOpen, Trash2, Calendar, Send, Save, Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// --- CONFIG ---
const API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BASE_URL = 'https://rest.api.bible/v1'; 

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
  { id: 'xl', size: 'text-xl', label: 'Extra Large' }
];

export default function BibleReader() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Data State
  const [bibles, setBibles] = useState<any[]>([]);
  const [selectedBible, setSelectedBible] = useState<string>(''); 
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [content, setContent] = useState<string>('');
  
  // Feature State (Persistence)
  const [view, setView] = useState<'reader' | 'journal'>('reader');
  const [bookmarks, setBookmarks] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_bookmarks') || '[]'));
  const [highlights, setHighlights] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_highlights') || '[]'));
  const [quotes, setQuotes] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_quotes') || '[]'));
  const [prayers, setPrayers] = useState<any[]>(() => JSON.parse(localStorage.getItem('lv_prayers') || '[]'));

  // Modal & Selection State
  const [activeModal, setActiveModal] = useState<'prayer' | 'quote' | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [fontSize, setFontSize] = useState('lg');
  const [theme, setTheme] = useState('dark');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Sync LocalStorage
  useEffect(() => {
    localStorage.setItem('lv_bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('lv_highlights', JSON.stringify(highlights));
    localStorage.setItem('lv_quotes', JSON.stringify(quotes));
    localStorage.setItem('lv_prayers', JSON.stringify(prayers));
  }, [bookmarks, highlights, quotes, prayers]);

  // API Helper
  const fetchWithKey = async (endpoint: string) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 'api-key': API_KEY, 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return response.json();
    } catch (err: any) { throw err; }
  };

  // Initial Loads - English & Amharic Only
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const bibleData = await fetchWithKey('/bibles');
        if (bibleData.data) {
          const filtered = bibleData.data.filter((b: any) => 
            b.language.id === 'eng' || b.language.id === 'amh'
          );
          setBibles(filtered);
          if (filtered.length > 0) setSelectedBible(filtered[0].id);
        }
      } catch (err: any) { setGlobalError(err.message); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedBible) {
      const loadBooks = async () => {
        const data = await fetchWithKey(`/bibles/${selectedBible}/books`);
        if (data.data) {
          setBooks(data.data);
          setSelectedBook(data.data[0].id);
        }
      };
      loadBooks();
    }
  }, [selectedBible]);

  useEffect(() => {
    if (selectedBible && selectedBook) {
      const loadChapters = async () => {
        const data = await fetchWithKey(`/bibles/${selectedBible}/books/${selectedBook}/chapters`);
        if (data.data) {
          setChapters(data.data);
          setSelectedChapter(data.data[0].id);
        }
      };
      loadChapters();
    }
  }, [selectedBible, selectedBook]);

  useEffect(() => {
    if (selectedBible && selectedChapter && view === 'reader') {
      const loadContent = async () => {
        setLoading(true);
        try {
          const data = await fetchWithKey(`/bibles/${selectedBible}/chapters/${selectedChapter}?content-type=html`);
          if (data.data) setContent(data.data.content);
        } finally { setLoading(false); }
      };
      loadContent();
    }
  }, [selectedBible, selectedChapter, view]);

  // Helpers
  const getSelectionInfo = () => window.getSelection()?.toString().trim() || '';

  const handleSaveEntry = () => {
    if (!modalInput.trim()) return;
    const newEntry = {
      id: Date.now(),
      ref: `${books.find(b => b.id === selectedBook)?.name} ${selectedChapter.split('.').pop()}`,
      bibleId: selectedBible,
      chapterId: selectedChapter,
      date: new Date().toLocaleDateString(),
      text: modalInput
    };
    if (activeModal === 'prayer') setPrayers([newEntry, ...prayers]);
    if (activeModal === 'quote') setQuotes([newEntry, ...quotes]);
    setModalInput('');
    setActiveModal(null);
  };

  const handleQuickAdd = (type: 'bookmark' | 'highlight') => {
    const selectedText = getSelectionInfo();
    if (type === 'highlight' && !selectedText) {
      alert("Please select a verse text first.");
      return;
    }
    const newEntry = {
      id: Date.now(),
      ref: `${books.find(b => b.id === selectedBook)?.name} ${selectedChapter.split('.').pop()}`,
      bibleId: selectedBible,
      chapterId: selectedChapter,
      date: new Date().toLocaleDateString(),
      text: selectedText || "Chapter Bookmark"
    };
    if (type === 'bookmark') setBookmarks([newEntry, ...bookmarks]);
    if (type === 'highlight') setHighlights([newEntry, ...highlights]);
  };

  const removeEntry = (type: string, id: number) => {
    if (type === 'bookmarks') setBookmarks(bookmarks.filter(b => b.id !== id));
    if (type === 'quotes') setQuotes(quotes.filter(q => q.id !== id));
    if (type === 'highlights') setHighlights(highlights.filter(h => h.id !== id));
    if (type === 'prayers') setPrayers(prayers.filter(p => p.id !== id));
  };

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[1];

  return (
    <div className={`fixed inset-0 flex flex-col ${currentTheme.bg} ${currentTheme.text} transition-colors duration-500 overflow-hidden`}>
      {/* HEADER - FIXED TOP */}
      <header className="flex-none h-20 z-40 backdrop-blur-md bg-opacity-80 border-b border-black/5 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowNav(true)} className="rounded-full"><Menu /></Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-widest leading-none mb-1">
              {view === 'reader' ? (books.find(b => b.id === selectedBook)?.name || 'Library') : 'Journal'}
            </h1>
            <span className="text-[10px] font-black text-primary-500 uppercase">{bibles.find(b => b.id === selectedBible)?.abbreviation || '---'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={view === 'journal' ? 'primary' : 'ghost'} 
            onClick={() => setView(view === 'reader' ? 'journal' : 'reader')}
            className="rounded-full px-4 text-[10px] font-black uppercase tracking-widest"
          >
            {view === 'reader' ? <MessageSquare size={18} /> : <BookOpen size={18} />}
          </Button>
          <Button variant="ghost" onClick={() => setShowSettings(true)} className="rounded-full"><Settings /></Button>
        </div>
      </header>

      {/* SCROLLABLE BODY - FITS BETWEEN HEADER & FOOTER */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="max-w-3xl mx-auto px-8 py-10">
          <AnimatePresence mode="wait">
            {view === 'reader' ? (
              <motion.div key="reader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="animate-spin text-primary-500" />
                    <p className="text-[10px] font-black uppercase opacity-30">Loading Scripture</p>
                  </div>
                ) : (
                  <div 
                    ref={contentRef}
                    className={`bible-content ${currentFontSize.size} font-serif leading-relaxed select-text`} 
                    dangerouslySetInnerHTML={{ __html: content }} 
                  />
                )}
              </motion.div>
            ) : (
              <motion.div key="journal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-12">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">Journal</h2>
                {[
                  { title: 'Bookmarks', data: bookmarks, type: 'bookmarks', color: 'bg-blue-500' },
                  { title: 'Quotes', data: quotes, type: 'quotes', color: 'bg-purple-500' },
                  { title: 'Prayers', data: prayers, type: 'prayers', color: 'bg-red-500' }
                ].map((section) => (
                  <div key={section.type} className="space-y-4">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${section.color}`} /> {section.title}
                     </p>
                     {section.data.length === 0 ? (
                       <div className="p-6 border border-dashed border-black/10 rounded-3xl text-center opacity-30 text-xs">Empty</div>
                     ) : (
                       <div className="space-y-3">
                         {section.data.map((item: any) => (
                           <div key={item.id} className="bg-black/5 dark:bg-white/5 p-5 rounded-3xl flex flex-col gap-3">
                             <div className="flex items-center justify-between">
                               <div className="flex flex-col">
                                 <span className="text-xs font-black uppercase">{item.ref}</span>
                                 <span className="text-[9px] font-bold opacity-40">{item.date}</span>
                               </div>
                               <div className="flex gap-1">
                                 <Button variant="ghost" onClick={() => { setSelectedBible(item.bibleId); setSelectedChapter(item.chapterId); setView('reader'); }} className="rounded-full p-2"><BookOpen size={14}/></Button>
                                 <Button variant="ghost" onClick={() => removeEntry(section.type, item.id)} className="rounded-full p-2 text-red-500"><Trash2 size={14}/></Button>
                               </div>
                             </div>
                             {item.text && <p className="text-sm italic opacity-80 border-l-2 border-primary-500/20 pl-3">{item.text}</p>}
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FOOTER - FIXED BOTTOM */}
      <footer className="flex-none h-20 border-t border-black/5 flex items-center justify-around px-8 bg-inherit z-40">
         <Button variant="ghost" onClick={() => {
           const i = chapters.findIndex(c => c.id === selectedChapter);
           if (i > 0) setSelectedChapter(chapters[i-1].id);
         }}><ChevronLeft /></Button>
         <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
           Chapter {selectedChapter.split('.').pop()}
         </div>
         <Button variant="ghost" onClick={() => {
           const i = chapters.findIndex(c => c.id === selectedChapter);
           if (i < chapters.length - 1) setSelectedChapter(chapters[i+1].id);
         }}><ChevronRight /></Button>
      </footer>

      {/* SETTINGS DRAWER - TOOLS ARE NOW HERE */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/40 z-[60]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 inset-x-0 bg-white dark:bg-stone-900 z-[70] rounded-t-[3rem] p-8 space-y-8 shadow-2xl">
               <div className="flex items-center justify-between"><h2 className="text-xl font-black uppercase tracking-tighter">Tools & Appearance</h2><Button variant="ghost" onClick={() => setShowSettings(false)}><X /></Button></div>
               
               {/* MINI TOOLS GRID */}
               <div className="grid grid-cols-4 gap-3">
                 <button onClick={() => { handleQuickAdd('bookmark'); setShowSettings(false); }} className="flex flex-col items-center gap-2 p-4 bg-black/5 rounded-2xl active:scale-95 transition-all">
                   <Bookmark size={20} className="text-blue-500" /><span className="text-[9px] font-black uppercase">Save</span>
                 </button>
                 <button onClick={() => { const t = getSelectionInfo(); setModalInput(t); setActiveModal('quote'); setShowSettings(false); }} className="flex flex-col items-center gap-2 p-4 bg-black/5 rounded-2xl active:scale-95 transition-all">
                   <Quote size={20} className="text-purple-500" /><span className="text-[9px] font-black uppercase">Quote</span>
                 </button>
                 <button onClick={() => { handleQuickAdd('highlight'); setShowSettings(false); }} className="flex flex-col items-center gap-2 p-4 bg-black/5 rounded-2xl active:scale-95 transition-all">
                   <PenTool size={20} className="text-amber-500" /><span className="text-[9px] font-black uppercase">Mark</span>
                 </button>
                 <button onClick={() => { setActiveModal('prayer'); setShowSettings(false); }} className="flex flex-col items-center gap-2 p-4 bg-black/5 rounded-2xl active:scale-95 transition-all">
                   <Heart size={20} className="text-red-500" /><span className="text-[9px] font-black uppercase">Pray</span>
                 </button>
               </div>

               <div className="h-px bg-black/5" />

               <div className="grid grid-cols-4 gap-3">
                 {THEMES.map(t => (
                   <button key={t.id} onClick={() => setTheme(t.id)} className={`h-12 rounded-2xl border-2 ${theme === t.id ? 'border-primary-500' : 'border-transparent'} ${t.bg}`} />
                 ))}
               </div>
               
               <div className="flex items-center justify-between bg-black/5 p-3 rounded-2xl">
                 <Button variant="ghost" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx > 0) setFontSize(FONT_SIZES[idx-1].id); }}><ZoomOut size={20}/></Button>
                 <span className="text-[10px] font-black uppercase tracking-widest">{currentFontSize.label}</span>
                 <Button variant="ghost" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx+1].id); }}><ZoomIn size={20}/></Button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NAV DRAWER */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/60 z-[60]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-[#0c0c0c] z-[70] flex flex-col shadow-2xl">
               <div className="p-6 border-b border-black/5 flex justify-between items-center">
                 <h2 className="font-black uppercase tracking-tighter text-xl italic">The Word</h2>
                 <Button variant="ghost" onClick={() => setShowNav(false)}><X /></Button>
               </div>
               <div className="p-4">
                 <select value={selectedBible} onChange={(e) => setSelectedBible(e.target.value)} className="w-full bg-black/5 p-4 text-[10px] font-black uppercase rounded-2xl border-none">
                   {bibles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                 </select>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll">
                 {books.map(b => (
                   <button key={b.id} onClick={() => { setSelectedBook(b.id); setShowNav(false); }} className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all ${selectedBook === b.id ? 'bg-primary-500 text-white' : 'hover:bg-black/5 opacity-60'}`}>
                     {b.name}
                   </button>
                 ))}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ENTRY MODAL */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-stone-900 w-full max-w-md rounded-[2.5rem] p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-black uppercase tracking-widest text-xs">{activeModal}</h3>
                <Button variant="ghost" onClick={() => setActiveModal(null)}><X size={18}/></Button>
              </div>
              <textarea 
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                placeholder="Write here..."
                className="w-full h-40 bg-black/5 dark:bg-white/5 rounded-2xl p-4 text-sm resize-none focus:outline-none"
              />
              <Button onClick={handleSaveEntry} className="w-full h-14 bg-primary-500 text-white rounded-2xl font-black uppercase text-[10px]">Save to Journal</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .bible-content .v { font-size: 0.6em; vertical-align: super; margin-right: 4px; font-weight: 800; color: #3b82f6; }
        .bible-content p { margin-bottom: 2rem; }
        .bible-content .s { display: block; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 3rem 0 1rem; font-size: 0.7em; opacity: 0.5; }
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(125,125,125,0.2); border-radius: 10px; }
      `}} />
    </div>
  );
}
