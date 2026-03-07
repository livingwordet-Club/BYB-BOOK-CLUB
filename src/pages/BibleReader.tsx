import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, X, MessageSquare, BookOpen, 
  ChevronLeft, ChevronRight, Loader2, Bookmark, 
  Library, Hand, Mic, Save, Search
} from 'lucide-react';
import { Button } from '../components/UI';
import { useAuth } from '../hooks/useAuth';

// --- INTERNAL CONFIGURATION ---
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
  
  // Server-Synced State
  const [highlights, setHighlights] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // UI State
  const [view, setView] = useState<'reader' | 'journal' | 'audio'>('reader');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [fontSize, setFontSize] = useState('lg');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Functional Pop-up State
  const [activeVerse, setActiveVerse] = useState<{number: string, text: string, x: number, y: number} | null>(null);
  const [showPrayerRecorder, setShowPrayerRecorder] = useState(false);
  const [prayerNote, setPrayerNote] = useState('');

  // --- API CALLS TO YOUR SERVER ---
  const fetchFromDb = async (endpoint: string, method = 'GET', body?: any) => {
    try {
        const res = await fetch(endpoint, {
          method,
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined
        });
        return await res.json();
    } catch (err) {
        console.error("API Error:", err);
        return null;
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      try {
        const versions = await fetchFromDb('/api/bible/versions');
        const userData = await fetchFromDb('/api/user/bible-data');
        
        if (versions && Array.isArray(versions)) {
          setBibles(versions);
          if (versions.length > 0) {
            setSelectedBible(versions[0].id);
          }
        }
        if (userData) {
            setHighlights(userData.highlights || []);
            setPrayers(userData.prayers || []);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
      setLoading(false);
    };
    if (token) initLoad();
  }, [token]);

  useEffect(() => {
    if (selectedBible) {
      fetchFromDb(`/api/bible/${selectedBible}/books`).then(data => {
          if (data && Array.isArray(data)) {
            setBooks(data);
            if (data.length > 0) setSelectedBook(data[0].id);
          }
      });
    }
  }, [selectedBible]);

  useEffect(() => {
    if (selectedBible && selectedBook) {
      fetchFromDb(`/api/bible/${selectedBible}/books/${selectedBook}/chapters`).then(data => {
          if (data && Array.isArray(data)) {
            setChapters(data);
            if (data.length > 0) setSelectedChapter(data[0].id);
          }
      });
    }
  }, [selectedBible, selectedBook]);

  useEffect(() => {
    if (selectedBible && selectedChapter && view === 'reader') {
      setLoading(true);
      fetchFromDb(`/api/bible/${selectedBible}/chapters/${selectedChapter}`)
        .then(d => {
            if (d && d.content) {
                setContent(d.content);
                if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
            }
        })
        .finally(() => setLoading(false));
    }
  }, [selectedBible, selectedChapter, view]);

  // --- VERSE ACTIONS ---

  const handleVerseClick = (e: React.MouseEvent, verseNum: string, text: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setActiveVerse({
      number: verseNum,
      text: text,
      x: rect.left,
      y: rect.top + window.scrollY - 100
    });
  };

  const saveHighlight = async (color: string) => {
    if (!activeVerse) return;
    try {
      const newH = await fetchFromDb('/api/highlights', 'POST', {
        verseRef: `${selectedBook} ${activeVerse.number}`,
        content: activeVerse.text,
        color
      });
      if (newH) setHighlights([newH, ...highlights]);
      setActiveVerse(null);
    } catch (err) {
      console.error("Failed to save highlight", err);
    }
  };

  const handleSavePrayer = async () => {
    if (!activeVerse) return;
    try {
      const newP = await fetchFromDb('/api/prayers', 'POST', {
        verseRef: `${selectedBook} ${activeVerse.number}`,
        note: prayerNote
      });
      if (newP) setPrayers([newP, ...prayers]);
      setShowPrayerRecorder(false);
      setPrayerNote('');
      setActiveVerse(null);
    } catch (err) {
      console.error("Failed to save prayer", err);
    }
  };

   const saveBookmark = async () => {
    if (!activeVerse) return;
    try {
      const newB = await fetchFromDb('/api/bookmarks', 'POST', {
        targetType: 'bible',
        targetId: `${selectedBook} ${activeVerse.number}`,
        description: `${selectedBook} ${activeVerse.number}`
      });
      if (newB) setBookmarks([newB, ...bookmarks]);
      setActiveVerse(null);
    } catch (err) {
      console.error("Failed to save bookmark", err);
    }
  };

  const renderVerses = () => {
    if (!content) return null;
    const isHtmlSpan = content.includes('data-number');
    
    if (isHtmlSpan) {
        const parts = content.split(/(<span data-number="\d+".*?<\/span>)/g);
        return parts.map((part, i) => {
          if (part.includes('data-number')) {
            const numMatch = part.match(/data-number="(\d+)"/);
            const num = numMatch ? numMatch[1] : "";
            return (
              <span 
                key={`v-${i}`} 
                onClick={(e) => handleVerseClick(e, num, part.replace(/<[^>]*>?/gm, ''))}
                className="inline-flex items-center justify-center w-6 h-6 mr-2 text-[10px] font-black bg-blue-600/10 text-blue-500 rounded cursor-pointer hover:bg-blue-600 hover:text-white transition-all"
              >
                {num}
              </span>
            );
          }
          return <span key={`text-${i}`} dangerouslySetInnerHTML={{ __html: part }} />;
        });
    } else {
        const parts = content.split(/(\[\d+\])/g);
        return parts.map((part, i) => {
          const isVerseNum = part.match(/\[(\d+)\]/);
          if (isVerseNum) {
            const num = isVerseNum[1];
            return (
              <span 
                key={`v-${i}`} 
                onClick={(e) => handleVerseClick(e, num, parts[i+1] || "")}
                className="inline-flex items-center justify-center w-6 h-6 mr-2 text-[10px] font-black bg-blue-600/20 text-blue-400 rounded-md cursor-pointer hover:bg-blue-600 hover:text-white transition-all"
              >
                {num}
              </span>
            );
          }
          return <span key={`text-${i}`} className="verse-text">{part}</span>;
        });
    }
  };

  const currentFontSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[0];

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#050505] text-stone-300 font-sans selection:bg-blue-500/30">
      
      {/* --- TOP NAVIGATION --- */}
      <nav className="h-20 w-full flex-none flex items-center justify-between px-6 z-[100] border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowNav(true)} className="rounded-full text-white">
            <Library size={22} />
          </Button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">
                {bibles?.find(b => b.id === selectedBible)?.abbreviation || 'BIBLE'}
            </span>
            <h2 className="text-sm font-bold text-white truncate max-w-[120px]">
              {books?.find(b => b.id === selectedBook)?.name} {selectedChapter?.split('.').pop()}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center bg-white/5 rounded-full px-4 py-2 border border-white/10">
                <Search size={14} className="opacity-30 mr-2" />
                <input 
                    type="text" placeholder="Search Scripture..." 
                    className="bg-transparent outline-none text-xs w-32 placeholder:opacity-20"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Button variant="ghost" onClick={() => setView(view === 'reader' ? 'journal' : 'reader')} className="rounded-full text-white">
                {view === 'reader' ? <MessageSquare size={20}/> : <BookOpen size={20}/>}
            </Button>
            <Button variant="ghost" onClick={() => setShowSettings(true)} className="rounded-full text-white">
                <Settings size={20} />
            </Button>
        </div>
      </nav>

      {/* --- CONTENT AREA --- */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto relative custom-scroll">
        <div className="max-w-3xl mx-auto px-8 py-16">
          {view === 'reader' ? (
            <div className="relative">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-40 opacity-20">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Illuminating Text</p>
                </div>
              ) : (
                <article className={`${currentFontSize.size} leading-[2.3] font-serif text-stone-200`}>
                  {renderVerses()}
                </article>
              )}
            </div>
          ) : view === 'journal' ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h3 className="text-5xl font-black italic tracking-tighter mb-12 text-white">Soul Journal</h3>
                <div className="grid gap-6">
                    {highlights?.map((h: any) => (
                        <div key={h?.id} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h?.color }} />
                                <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">{h?.verse_ref}</span>
                            </div>
                            <p className="text-lg italic opacity-80 leading-relaxed">"{h?.content}"</p>
                        </div>
                    ))}
                    {prayers?.map((p: any) => (
                        <div key={p?.id} className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/10">
                             <div className="flex items-center gap-3 mb-4">
                                <Hand size={14} className="text-red-500" />
                                <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">Prayer Note • {p?.verse_ref}</span>
                            </div>
                            <p className="text-stone-300">{p?.note}</p>
                        </div>
                    ))}
                </div>
            </div>
          ) : (
            <div className="text-center py-40">
                <p className="opacity-20 font-black uppercase tracking-widest">Audiobook Engine Ready</p>
            </div>
          )}
        </div>

        {/* --- FLOATING VERSE MENU --- */}
        <AnimatePresence>
          {activeVerse && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              style={{ left: `calc(${activeVerse.x}px - 140px)`, top: `${activeVerse.y}px` }}
              className="fixed z-[500] bg-stone-900 border border-white/10 p-5 rounded-[2.5rem] shadow-2xl w-[300px]"
            >
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-blue-500 uppercase">Verse {activeVerse.number}</span>
                <button onClick={() => setActiveVerse(null)} className="opacity-30 hover:opacity-100"><X size={14}/></button>
              </div>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c} onClick={() => saveHighlight(c)} className="w-8 h-8 rounded-full hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPrayerRecorder(true)} className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-2xl text-[9px] font-black uppercase">
                  <Hand size={14} className="text-red-500" /> Prayer
                </button>
                <button onClick={saveBookmark} className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-2xl text-[9px] font-black uppercase">
                  <Bookmark size={14} className="text-blue-500" /> Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- PRAYER MODAL --- */}
      <AnimatePresence>
        {showPrayerRecorder && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-stone-900 w-full max-w-md p-10 rounded-[3.5rem] border border-white/10 relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black italic">Sacred Note</h3>
                  <button onClick={() => setShowPrayerRecorder(false)} className="opacity-50 hover:opacity-100 transition-opacity"><X/></button>
                </div>
                <div className="bg-white/5 p-6 rounded-[2rem] mb-6 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                      <Mic size={24} className="text-red-500" />
                    </div>
                    <textarea 
                        value={prayerNote} onChange={(e) => setPrayerNote(e.target.value)}
                        placeholder="Speak to the Father..." 
                        className="w-full bg-transparent border-none outline-none text-lg italic min-h-[100px] placeholder:opacity-10"
                    />
                </div>
                <Button onClick={handleSavePrayer} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase tracking-widest">
                    <Save size={18} className="mr-2"/> Commit to Heart
                </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FOOTER SLOGAN & PAGINATION --- */}
      <footer className="h-20 w-full flex-none flex items-center justify-between px-10 border-t border-white/5 bg-[#050505] z-[100]">
        <Button variant="ghost" onClick={() => {
            const idx = chapters?.findIndex(c => c.id === selectedChapter);
            if (idx > 0) setSelectedChapter(chapters[idx-1].id);
          }} className="text-white opacity-40 hover:opacity-100 transition-opacity">
          <ChevronLeft size={28} />
        </Button>
        <div className="flex flex-col items-center">
            <div className="w-32 h-[2px] bg-white/5 rounded-full mb-3 overflow-hidden">
                <motion.div animate={{ width: `${chapters?.length > 0 ? (chapters.findIndex(c => c.id === selectedChapter) + 1) / chapters.length * 100 : 0}%` }} className="h-full bg-blue-600" />
            </div>
            <span className="text-[10px] font-black tracking-[0.5em] opacity-20 uppercase">{APP_SLOGAN}</span>
        </div>
        <Button variant="ghost" onClick={() => {
            const idx = chapters?.findIndex(c => c.id === selectedChapter);
            if (idx < (chapters?.length || 0) - 1) setSelectedChapter(chapters[idx+1].id);
          }} className="text-white opacity-40 hover:opacity-100 transition-opacity">
          <ChevronRight size={28} />
        </Button>
      </footer>

      {/* --- NAVIGATION OVERLAY --- */}
      <AnimatePresence>
        {showNav && (
          <React.Fragment>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNav(false)} className="fixed inset-0 bg-black/95 backdrop-blur-md z-[1000]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30 }} className="fixed inset-y-0 left-0 w-full max-w-sm bg-stone-950 z-[1010] flex flex-col p-10">
                <div className="flex justify-between items-center mb-12">
                    <h2 className="text-4xl font-black italic tracking-tighter">Library</h2>
                    <button onClick={() => setShowNav(false)}><X size={32}/></button>
                </div>
                <div className="space-y-1 overflow-y-auto custom-scroll pr-4">
                    {books?.map((b: any) => (
                        <button key={b?.id} onClick={() => { setSelectedBook(b?.id); setShowNav(false); }} className={`w-full text-left p-5 rounded-2xl font-bold transition-all ${selectedBook === b?.id ? 'bg-blue-600 text-white' : 'hover:bg-white/5 opacity-40 hover:opacity-100'}`}>
                            {b?.name}
                        </button>
                    ))}
                </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      {/* --- SETTINGS DRAWER --- */}
      <AnimatePresence>
        {showSettings && (
          <React.Fragment>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/60 z-[1000]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 inset-x-0 bg-stone-900 p-12 rounded-t-[4rem] z-[1010] border-t border-white/10">
                <div className="max-w-xl mx-auto">
                    <div className="flex justify-between items-center mb-10">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Reading Experience</span>
                        <button onClick={() => setShowSettings(false)}><X/></button>
                    </div>
                    <div className="grid grid-cols-3 gap-6 mb-12">
                        {FONT_SIZES?.map(f => (
                            <button key={f?.id} onClick={() => setFontSize(f?.id)} className={`p-6 rounded-[2rem] border transition-all ${fontSize === f?.id ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-transparent opacity-40 hover:opacity-100'}`}>
                                <span className={`font-black ${f?.size === 'text-base' ? 'text-sm' : f?.size === 'text-lg' ? 'text-lg' : 'text-2xl'}`}>Aa</span>
                                <p className="text-[9px] font-black uppercase mt-2">{f?.label}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .font-serif { font-family: 'Crimson Pro', serif; }
        .verse-text { transition: all 0.2s; cursor: pointer; border-radius: 4px; padding: 2px 0; }
        .verse-text:hover { background: rgba(59, 130, 246, 0.1); }
        ::selection { background: rgba(59, 130, 246, 0.4); }
      `}} />
    </div>
  );
}
