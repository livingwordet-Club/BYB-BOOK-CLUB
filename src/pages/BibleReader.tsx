import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input } from '../components/UI';
import { 
  Book, ChevronLeft, ChevronRight, Settings, Highlighter, 
  Bookmark, StickyNote, Heart, Search, Type, Palette, 
  ZoomIn, ZoomOut, X, Menu, Share2, Headphones, Loader2, 
  AlertCircle, Key, Globe, Zap, Quote, PenTool, MessageSquare,
  BookOpen, Trash2, Calendar, Send, Save
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

  // Modal State
  const [activeModal, setActiveModal] = useState<'prayer' | 'quote' | null>(null);
  const [modalInput, setModalInput] = useState('');

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

  // Initial Loads
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const bibleData = await fetchWithKey('/bibles');
        if (bibleData.data) {
          setBibles(bibleData.data);
          setSelectedBible(bibleData.data[0].id);
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

  // Handle Saves
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
    const newEntry = {
      id: Date.now(),
      ref: `${books.find(b => b.id === selectedBook)?.name} ${selectedChapter.split('.').pop()}`,
      bibleId: selectedBible,
      chapterId: selectedChapter,
      date: new Date().toLocaleDateString()
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
    <div className={`min-h-screen flex flex-col ${currentTheme.bg} ${currentTheme.text} transition-colors duration-500`}>
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-opacity-80 border-b border-black/5 flex items-center justify-between px-6 h-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowNav(true)} className="rounded-full"><Menu /></Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-widest leading-none mb-1">
              {view === 'reader' ? (books.find(b => b.id === selectedBook)?.name || 'Library') : 'Journal'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-primary-500 uppercase">{bibles.find(b => b.id === selectedBible)?.abbreviation || '---'}</span>
            </div>
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

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 pt-8 max-w-5xl mx-auto w-full">
        <button onClick={() => handleQuickAdd('bookmark')} className="bg-black/5 dark:bg-white/5 p-6 rounded-[2rem] flex flex-col items-center group active:scale-95 transition-all">
            <Bookmark className="text-blue-500 mb-2" size={24} />
            <span className="text-2xl font-black">{bookmarks.length}</span>
            <span className="text-[10px] font-bold opacity-40 uppercase">Bookmarks</span>
        </button>
        <button onClick={() => setActiveModal('quote')} className="bg-black/5 dark:bg-white/5 p-6 rounded-[2rem] flex flex-col items-center group active:scale-95 transition-all">
            <Quote className="text-purple-500 mb-2" size={24} />
            <span className="text-2xl font-black">{quotes.length}</span>
            <span className="text-[10px] font-bold opacity-40 uppercase">Quote it</span>
        </button>
        <button onClick={() => handleQuickAdd('highlight')} className="bg-black/5 dark:bg-white/5 p-6 rounded-[2rem] flex flex-col items-center group active:scale-95 transition-all">
            <PenTool className="text-amber-500 mb-2" size={24} />
            <span className="text-2xl font-black">{highlights.length}</span>
            <span className="text-[10px] font-bold opacity-40 uppercase">Highlights</span>
        </button>
        <button onClick={() => setActiveModal('prayer')} className="bg-black/5 dark:bg-white/5 p-6 rounded-[2rem] flex flex-col items-center group active:scale-95 transition-all">
            <Heart className="text-red-500 mb-2" size={24} />
            <span className="text-2xl font-black">{prayers.length}</span>
            <span className="text-[10px] font-bold opacity-40 uppercase">Pray</span>
        </button>
      </div>

      {/* MAIN VIEW */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-12">
        <AnimatePresence mode="wait">
          {view === 'reader' ? (
            <motion.div key="reader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <Loader2 className="animate-spin text-primary-500" />
                  <p className="text-[10px] font-black uppercase opacity-30">Opening Manuscripts</p>
                </div>
              ) : (
                <div className={`bible-content ${currentFontSize.size} font-serif leading-relaxed`} dangerouslySetInnerHTML={{ __html: content }} />
              )}
            </motion.div>
          ) : (
            <motion.div key="journal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-12">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic">My Journal</h2>
              
              {[
                { title: 'Recent Bookmarks', data: bookmarks, type: 'bookmarks', color: 'bg-blue-500' },
                { title: 'Saved Quotes', data: quotes, type: 'quotes', color: 'bg-purple-500' },
                { title: 'Prayer Petitions', data: prayers, type: 'prayers', color: 'bg-red-500' }
              ].map((section) => (
                <div key={section.type} className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full ${section.color}`} /> {section.title}
                   </p>
                   {section.data.length === 0 ? (
                     <div className="p-8 border-2 border-dashed border-black/5 rounded-[2.5rem] text-center opacity-30 text-xs font-bold">No entries yet.</div>
                   ) : (
                     <div className="space-y-3">
                       {section.data.map((item: any) => (
                         <div key={item.id} className="bg-black/5 dark:bg-white/5 p-6 rounded-[2rem] flex flex-col gap-4 group">
                           <div className="flex items-center justify-between">
                             <div className="flex flex-col gap-1">
                               <span className="text-sm font-black uppercase">{item.ref}</span>
                               <span className="text-[10px] font-bold opacity-40">{item.date}</span>
                             </div>
                             <div className="flex gap-2">
                               <Button variant="ghost" onClick={() => { setSelectedBible(item.bibleId); setSelectedChapter(item.chapterId); setView('reader'); }} className="rounded-full bg-white dark:bg-stone-800 p-2"><BookOpen size={14}/></Button>
                               <Button variant="ghost" onClick={() => removeEntry(section.type, item.id)} className="rounded-full bg-red-500/10 text-red-500 p-2"><Trash2 size={14}/></Button>
                             </div>
                           </div>
                           {item.text && <p className="text-sm italic opacity-80 border-l-2 border-black/10 pl-4">{item.text}</p>}
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-[3rem] overflow-hidden">
               <div className="p-10 space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeModal === 'prayer' ? 'bg-red-500/10 text-red-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {activeModal === 'prayer' ? <Heart size={24} /> : <Quote size={24} />}
                      </div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">{activeModal === 'prayer' ? 'Prayer Journal' : 'Save Verse'}</h2>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{books.find(b => b.id === selectedBook)?.name} {selectedChapter.split('.').pop()}</p>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => setActiveModal(null)}><X /></Button>
                 </div>
                 
                 <textarea 
                   autoFocus
                   value={modalInput}
                   onChange={(e) => setModalInput(e.target.value)}
                   placeholder={activeModal === 'prayer' ? "Type your prayer here..." : "Paste or type the verse text here..."}
                   className="w-full h-48 bg-black/5 dark:bg-white/5 rounded-3xl p-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none transition-all"
                 />

                 <div className="flex gap-4">
                   <Button variant="ghost" onClick={() => setActiveModal(null)} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</Button>
                   <Button onClick={handleSaveEntry} className="flex-2 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary-500 text-white flex items-center gap-2 justify-center px-8">
                     <Save size={16} /> Save Entry
                   </Button>
                 </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      {view === 'reader' && (
        <footer className="h-24 border-t border-black/5 flex items-center justify-around px-8 sticky bottom-0 bg-inherit">
           <Button variant="ghost" onClick={() => {
             const i = chapters.findIndex(c => c.id === selectedChapter);
             if (i > 0) setSelectedChapter(chapters[i-1].id);
           }}><ChevronLeft /></Button>
           <div className="h-1 flex-1 max-w-[150px] bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary-500" animate={{ width: `${(chapters.findIndex(c => c.id === selectedChapter) + 1) / (chapters.length || 1) * 100}%` }} />
           </div>
           <Button variant="ghost" onClick={() => {
             const i = chapters.findIndex(c => c.id === selectedChapter);
             if (i < chapters.length - 1) setSelectedChapter(chapters[i+1].id);
           }}><ChevronRight /></Button>
        </footer>
      )}

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
                <Button variant="ghost" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx > 0) setFontSize(FONT_SIZES[idx-1].id); }}><ZoomOut /></Button>
                <span className="text-xs font-black uppercase tracking-widest">{currentFontSize.label}</span>
                <Button variant="ghost" onClick={() => { const idx = FONT_SIZES.findIndex(f => f.id === fontSize); if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx+1].id); }}><ZoomIn /></Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NAV DRAWER */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/60 z-50" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-y-0 left-0 w-full max-w-md bg-white dark:bg-[#0c0c0c] z-50 flex flex-col shadow-2xl">
               <div className="p-8 border-b border-black/5 flex justify-between items-center">
                 <h2 className="font-black uppercase tracking-tighter text-2xl italic">Holy Bible</h2>
                 <Button variant="ghost" onClick={() => setShowNav(false)}><X /></Button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 space-y-1 custom-scroll">
                 {books.map(b => (
                   <button key={b.id} onClick={() => { setSelectedBook(b.id); setShowNav(false); setView('reader'); }} className={`w-full text-left p-4 rounded-2xl text-sm font-bold transition-all ${selectedBook === b.id ? 'bg-primary-500/10 text-primary-500' : 'hover:bg-black/5 opacity-60'}`}>
                     {b.name}
                   </button>
                 ))}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .bible-content .v { font-size: 0.6em; vertical-align: super; margin-right: 6px; font-weight: 800; color: #3b82f6; opacity: 0.6; }
        .bible-content p { margin-bottom: 2.5rem; }
        .bible-content .s { display: block; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 4rem 0 1.5rem; font-size: 0.8em; opacity: 0.4; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}
