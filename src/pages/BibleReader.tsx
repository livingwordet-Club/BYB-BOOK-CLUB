import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input } from '../components/UI';
import { Book, ChevronLeft, ChevronRight, Settings, Highlighter, Bookmark, StickyNote, Heart, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const VERSIONS = [
  { id: 'KJV', name: 'KJV (English)' },
  { id: 'AMP', name: 'AMP (English)' },
  { id: 'ESV', name: 'ESV (English)' },
  { id: 'AMH', name: 'Amharic (Standard)' },
  { id: 'AMH_OLD', name: 'Amharic (Older)' }
];

const BOOK_MAP: Record<string, number> = {
  'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
  'Joshua': 6, 'Judges': 7, 'Ruth': 8, '1 Samuel': 9, '2 Samuel': 10,
  '1 Kings': 11, '2 Kings': 12, '1 Chronicles': 13, '2 Chronicles': 14,
  'Ezra': 15, 'Nehemiah': 16, 'Esther': 17, 'Job': 18, 'Psalms': 19,
  'Proverbs': 20, 'Ecclesiastes': 21, 'Song of Solomon': 22, 'Isaiah': 23,
  'Jeremiah': 24, 'Lamentations': 25, 'Ezekiel': 26, 'Daniel': 27,
  'Hosea': 28, 'Joel': 29, 'Amos': 30, 'Obadiah': 31, 'Jonah': 32,
  'Micah': 33, 'Nahum': 34, 'Habakkuk': 35, 'Zephaniah': 36, 'Haggai': 37,
  'Zechariah': 38, 'Malachi': 39, 'Matthew': 40, 'Mark': 41, 'Luke': 42,
  'John': 43, 'Acts': 44, 'Romans': 45, '1 Corinthians': 46, '2 Corinthians': 47,
  'Galatians': 48, 'Ephesians': 49, 'Philippians': 50, 'Colossians': 51,
  '1 Thessalonians': 52, '2 Thessalonians': 53, '1 Timothy': 54, '2 Timothy': 55,
  'Titus': 56, 'Philemon': 57, 'Hebrews': 58, 'James': 59, '1 Peter': 60,
  '2 Peter': 61, '1 John': 62, '2 John': 63, '3 John': 64, 'Jude': 65,
  'Revelation': 66
};

const COLORS = [
  'bg-yellow-200', 'bg-green-200', 'bg-blue-200', 'bg-pink-200', 'bg-purple-200',
  'bg-orange-200', 'bg-red-200', 'bg-teal-200', 'bg-indigo-200', 'bg-gray-200'
];

export default function BibleReader() {
  const { token, logout } = useAuth();
  const [version, setVersion] = useState('KJV');
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(3);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<any[]>([]);

  useEffect(() => {
    fetchVerses();
    fetchHighlights();
  }, [book, chapter, version]);

  const cleanText = (text: string) => {
    if (!text) return '';
    // Remove HTML tags, Strong's numbers in brackets/braces, and extra whitespace
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  const fetchVerses = async () => {
    setLoading(true);
    try {
      // 1. Primary choice for KJV is bible-api.com (Cleaner text)
      if (version === 'KJV') {
        const res = await fetch(`https://bible-api.com/${book}+${chapter}?translation=kjv`);
        const data = await res.json();
        if (data.verses) {
          setVerses(data.verses.map((v: any) => ({ ...v, text: cleanText(v.text) })));
          setLoading(false);
          return;
        }
      }

      // 2. For others or if KJV fails, try bolls.life
      const bookId = BOOK_MAP[book] || 43;
      // Bolls slugs are usually uppercase. For Amharic, try 'AMH'
      const apiVersion = version === 'AMH_OLD' ? 'AMH' : version; 
      const res = await fetch(`https://bolls.life/get-text/${apiVersion}/${bookId}/${chapter}/`);
      const data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const cleanedVerses = data.map(v => ({
          ...v,
          text: cleanText(v.text)
        }));
        setVerses(cleanedVerses);
      } else {
        // 3. Final Fallback to bible-api.com for any version
        const fallbackVersion = version === 'AMH_OLD' ? 'amh' : version.toLowerCase();
        const resFallback = await fetch(`https://bible-api.com/${book}+${chapter}?translation=${fallbackVersion}`);
        const dataFallback = await resFallback.json();
        if (dataFallback.verses) {
          setVerses(dataFallback.verses.map((v: any) => ({ ...v, text: cleanText(v.text) })));
        } else {
          // If still blank and it's Amharic, try a different known slug on Bolls
          if (version.includes('AMH')) {
             const resAmh = await fetch(`https://bolls.life/get-text/AMHARIC/${bookId}/${chapter}/`);
             const dataAmh = await resAmh.json();
             if (Array.isArray(dataAmh)) {
                setVerses(dataAmh.map(v => ({ ...v, text: cleanText(v.text) })));
             } else {
                setVerses([]);
             }
          } else {
            setVerses([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setVerses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHighlights = async () => {
    try {
      const res = await fetch('/api/activity', {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      const data = await res.json();
      setHighlights(Array.isArray(data) ? data.filter((a: any) => a.type === 'highlight') : []);
    } catch (err) {
      console.error("Failed to fetch highlights:", err);
    }
  };

  const handleHighlight = async (color: string) => {
    if (selectedVerse === null) return;
    const verse = verses.find(v => v.verse === selectedVerse);
    await fetch('/api/activity', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            type: 'highlight',
            content: verse.text,
            metadata: { color, book, chapter, verse: selectedVerse }
        })
    });
    fetchHighlights();
    setSelectedVerse(null);
  };

  const isHighlighted = (vNum: number) => {
    return highlights.find(h => {
        const meta = JSON.parse(h.metadata);
        return meta.book === book && meta.chapter === chapter && meta.verse === vNum;
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Tablet Frame */}
      <div className="max-w-4xl w-full bg-primary-900 rounded-[3rem] shadow-2xl border-[12px] border-primary-950 overflow-hidden flex flex-col h-[85vh]">
        {/* Tablet Top Bar */}
        <div className="bg-primary-950 p-4 flex items-center justify-between text-white px-8">
          <div className="flex items-center gap-4">
            <select 
              value={version} 
              onChange={e => setVersion(e.target.value)}
              className="bg-primary-800 text-sm rounded-lg px-3 py-1 outline-none border border-primary-700"
            >
              {VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <select 
                value={book} 
                onChange={e => setBook(e.target.value)}
                className="w-40 h-8 text-sm bg-primary-800 border border-primary-700 rounded-lg text-white outline-none px-2"
              >
                {Object.keys(BOOK_MAP).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <Input 
                type="number"
                value={chapter} 
                onChange={e => setChapter(Number(e.target.value))}
                className="w-16 h-8 text-sm bg-primary-800 border-primary-700 text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-white hover:bg-primary-800"><Search className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-primary-800"><Settings className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Reader Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 font-serif text-lg leading-relaxed text-primary-100 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <h1 className="text-4xl font-bold mb-8 text-center text-primary-50">{book} {chapter}</h1>
              {verses.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-primary-400 mb-4">No text found for this version/chapter.</p>
                  <Button onClick={fetchVerses} variant="outline">Retry Loading</Button>
                </div>
              ) : (
                verses.map((v: any) => {
                  const highlight = isHighlighted(v.verse);
                  return (
                    <span 
                      key={v.verse}
                      onClick={() => setSelectedVerse(v.verse)}
                      className={cn(
                          "cursor-pointer transition-colors rounded px-1 inline-block mb-2",
                          selectedVerse === v.verse ? "bg-primary-800 ring-2 ring-primary-600" : "",
                          highlight ? JSON.parse(highlight.metadata).color : "hover:bg-primary-800"
                      )}
                    >
                      <sup className="text-xs font-bold mr-1 text-primary-400">{v.verse}</sup>
                      {v.text}
                    </span>
                  );
                })
              )}
            </div>
          )}

          {/* Floating Tools */}
          <AnimatePresence>
            {selectedVerse && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-stone-900 rounded-2xl shadow-2xl border border-white/10 p-4 flex flex-col gap-4 z-50"
              >
                <div className="flex items-center gap-2">
                  {COLORS.map(color => (
                    <button 
                      key={color}
                      onClick={() => handleHighlight(color)}
                      className={cn("w-8 h-8 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110", color)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-around border-t border-white/10 pt-4">
                  <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-stone-300 hover:text-white hover:bg-white/10">
                    <Highlighter className="w-4 h-4" /> <span className="text-[10px]">Highlight</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-stone-300 hover:text-white hover:bg-white/10">
                    <Bookmark className="w-4 h-4" /> <span className="text-[10px]">Bookmark</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-stone-300 hover:text-white hover:bg-white/10">
                    <StickyNote className="w-4 h-4" /> <span className="text-[10px]">Note</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-stone-300 hover:text-white hover:bg-white/10">
                    <Heart className="w-4 h-4" /> <span className="text-[10px]">Pray</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tablet Bottom Bar */}
        <div className="bg-stone-50 border-t p-4 flex items-center justify-between px-12 dark:bg-primary-950 dark:border-primary-800">
          <Button 
            variant="ghost" 
            onClick={() => setChapter(Math.max(1, chapter - 1))}
            className="flex items-center gap-2 text-stone-600 dark:text-primary-400"
          >
            <ChevronLeft /> Previous
          </Button>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-stone-300 dark:bg-primary-800" />
            ))}
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setChapter(chapter + 1)}
            className="flex items-center gap-2 text-stone-600 dark:text-primary-400"
          >
            Next <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
