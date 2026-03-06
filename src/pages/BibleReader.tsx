import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, X, Menu, MessageSquare, BookOpen, 
  ChevronLeft, ChevronRight, Loader2, Bookmark, 
  Quote, PenTool, Heart, Trash2, ZoomIn, ZoomOut 
} from 'lucide-react';
import { Button } from '../components/UI';
import { useAuth } from '../hooks/useAuth';

// --- CONFIG ---
const API_KEY = 'JT9CAQaoRjmSgdBxcT4tG';
const BASE_URL = 'https://rest.api.bible/v1'; 

const THEMES = [
  { id: 'light', bg: 'bg-[#F7F6E5]', text: 'text-stone-900' },
  { id: 'sepia', bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]' },
  { id: 'dark', bg: 'bg-[#050505]', text: 'text-stone-400' }
];

const FONT_SIZES = [
  { id: 'base', size: 'text-base', label: 'Normal' },
  { id: 'lg', size: 'text-lg', label: 'Large' },
  { id: 'xl', size: 'text-xl', label: 'Extra' }
];

export default function BibleReader() {
  const { token } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  
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

  // 4. Load Content
  useEffect(() => {
    if (selectedBible && selectedChapter && view === 'reader') {
      setLoading(true);
      fetchApi(`/bibles/${selectedBible}/chapters/${selectedChapter}?content-type=html`)
        .then(d => setContent(d.data.content))
        .finally(() => setLoading(false));
    }
  }, [selectedBible, selectedChapter, view]);

  const handleQuickAdd = (type: 'bookmark' | 'highlight') => {
    const selection = window.getSelection()?.toString().trim();
    if (type === 'highlight' && !selection) return alert("Select text first!");
    const entry = { id: Date.now(), ref: selectedChapter, text: selection || "Bookmark", date: new Date().toLocaleDateString() };
    if (type === 'bookmark') setBookmarks([entry, ...bookmarks]);
    else setHighlights([entry, ...highlights]);
  };

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[0];

  return (
    <div className={`fixed inset-0 flex flex-col ${currentTheme.bg} ${currentTheme.text} overflow-hidden font-sans`}>
      
      {/* --- HEADER (Fixed Height: 80px) --- */}
      <header className="h-20 flex-none border-b border-white/10 flex items-center justify-between px-6 z-50 bg-inherit">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowNav(true)}><Menu /></Button>
          <div>
            <h2 className="text-xs font-black uppercase tracking-tighter">
              {books.find(b => b.id === selectedBook)?.name || 'Loading...'}
            </h2>
            <p className="text-[10px] opacity-50 uppercase">{selectedChapter.split('.').pop()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setView(view === 'reader' ? 'journal' : 'reader')}>
            {view === 'reader' ? <MessageSquare size={20}/> : <BookOpen size={20}/>}
          </Button>
          <Button variant="ghost" onClick={() => setShowSettings(true)}><Settings /></Button>
        </div>
      </header>

      {/* --- MAIN SCROLLABLE AREA --- */}
      <main className="flex-1 overflow-y-auto relative custom-scroll">
        <div className="max-w-2xl mx-auto px-6 py-10 min-h-full">
          {view === 'reader' ? (
            <div className="relative">
              {loading ? (
                <div className="flex flex-col items-center py-20 opacity-20"><Loader2 className="animate-spin mb-2" /><span className="text-[10px] font-bold">SYMBOLS LOADING</span></div>
              ) : (
                <div 
                  className={`bible-reader-content ${currentFontSize.size} leading-relaxed font-serif`}
                  dangerouslySetInnerHTML={{ __html: content }} 
                />
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <h3 className="text-3xl font-black italic">Journal</h3>
              {/* Journal List Items */}
              {bookmarks.map(b => (
                <div key={b.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                  <span className="text-xs font-bold uppercase">{b.ref}</span>
                  <Button variant="ghost" onClick={() => setBookmarks(bookmarks.filter(x => x.id !== b.id))}><Trash2 size={14} className="text-red-500"/></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- FOOTER (Fixed Height: 80px) --- */}
      <footer className="h-20 flex-none border-t border-white/10 bg-inherit flex items-center justify-between px-10 z-50">
        <Button variant="ghost" onClick={() => {
          const idx = chapters.findIndex(c => c.id === selectedChapter);
          if (idx > 0) setSelectedChapter(chapters[idx-1].id);
        }}><ChevronLeft /></Button>
        
        <div className="text-[10px] font-black opacity-30 tracking-[0.3em]">THE WORD</div>
        
        <Button variant="ghost" onClick={() => {
          const idx = chapters.findIndex(c => c.id === selectedChapter);
          if (idx < chapters.length - 1) setSelectedChapter(chapters[idx+1].id);
        }}><ChevronRight /></Button>
      </footer>

      {/* --- SETTINGS DRAWER --- */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/60 z-[60]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 inset-x-0 bg-stone-900 p-8 rounded-t-[3rem] z-[70] border-t border-white/10">
              <div className="flex justify-between items-center mb-8">
                <h4 className="font-black uppercase text-sm">Tools</h4>
                <Button variant="ghost" onClick={() => setShowSettings(false)}><X /></Button>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-8">
                <button onClick={() => { handleQuickAdd('bookmark'); setShowSettings(false); }} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl"><Bookmark className="text-blue-500"/><span className="text-[9px] font-bold">SAVE</span></button>
                <button onClick={() => { handleQuickAdd('highlight'); setShowSettings(false); }} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl"><PenTool className="text-amber-500"/><span className="text-[9px] font-bold">MARK</span></button>
                <button onClick={() => { setActiveModal('quote'); setShowSettings(false); }} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl"><Quote className="text-purple-500"/><span className="text-[9px] font-bold">QUOTE</span></button>
                <button onClick={() => { setActiveModal('prayer'); setShowSettings(false); }} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl"><Heart className="text-red-500"/><span className="text-[9px] font-bold">PRAY</span></button>
              </div>
              <div className="flex gap-4">
                {THEMES.map(t => <button key={t.id} onClick={() => setTheme(t.id)} className={`flex-1 h-12 rounded-xl border-2 ${theme === t.id ? 'border-blue-500' : 'border-transparent'} ${t.bg}`} />)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- NAVIGATION DRAWER (Access Books/Chapters) --- */}
      <AnimatePresence>
        {showNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/80 z-[60]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-y-0 left-0 w-80 bg-stone-950 z-[70] border-r border-white/10 flex flex-col">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="font-black italic text-xl">Library</h2>
                <Button variant="ghost" onClick={() => setShowNav(false)}><X /></Button>
              </div>
              <div className="p-4">
                <select value={selectedBible} onChange={(e) => setSelectedBible(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-[10px] font-bold uppercase outline-none">
                  {bibles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll">
                {books.map(b => (
                  <button 
                    key={b.id} 
                    onClick={() => { setSelectedBook(b.id); setShowNav(false); }}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold ${selectedBook === b.id ? 'bg-blue-600 text-white' : 'opacity-40 hover:opacity-100'}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .bible-reader-content .v { font-size: 0.5em; vertical-align: super; margin-right: 4px; font-weight: 800; color: #3b82f6; }
        .bible-reader-content p { margin-bottom: 1.5rem; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}
