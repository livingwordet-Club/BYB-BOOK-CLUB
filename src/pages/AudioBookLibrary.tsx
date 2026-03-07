/* Line 1 */ import React, { useState, useEffect } from 'react';
/* Line 2 */ import { motion, AnimatePresence } from 'motion/react';
/* Line 3 */ import { Card, Button, Input } from '../components/UI';
/* Line 4 */ import { useAuth } from '../hooks/useAuth';
/* Line 5 */ import { Headphones, Play, Pause, Search, Clock, User, Volume2, ArrowLeft, SkipBack, SkipForward, X as CloseIcon, ExternalLink } from 'lucide-react';
/* Line 6 */ 
/* Line 7 */ const FEATURED_BOOKS = [
/* Line 8 */   {
/* Line 9 */     id: '391',
/* Line 10 */     title: 'The Confessions of Saint Augustine',
/* Line 11 */     authors: [{ first_name: 'Saint', last_name: 'Augustine' }],
/* Line 12 */     totallistenertime: '14:30:00',
/* Line 13 */     description: 'One of the most influential works in Christian history, this spiritual autobiography describes Augustine\'s journey from a life of sin to his conversion to Christianity.',
/* Line 14 */     url_librivox: 'https://librivox.org/the-confessions-of-saint-augustine/'
/* Line 15 */   },
/* Line 16 */   {
/* Line 17 */     id: '104',
/* Line 18 */     title: 'The Pilgrim\'s Progress',
/* Line 19 */     authors: [{ first_name: 'John', last_name: 'Bunyan' }],
/* Line 20 */     totallistenertime: '09:15:00',
/* Line 21 */     description: 'A world-famous Christian allegory that follows the journey of a man named Christian from the "City of Destruction" to the "Celestial City."',
/* Line 22 */     url_librivox: 'https://librivox.org/the-pilgrims-progress-by-john-bunyan/'
/* Line 23 */   }
/* Line 24 */ ];
/* Line 25 */ 
/* Line 26 */ export default function AudioBookLibrary() {
/* Line 27 */   const { token, logout } = useAuth();
/* Line 28 */   const [books, setBooks] = useState<any[]>(FEATURED_BOOKS);
/* Line 29 */   const [loading, setLoading] = useState(true);
/* Line 30 */   const [search, setSearch] = useState('');
/* Line 31 */   const [selectedBook, setSelectedBook] = useState<any>(null);
/* Line 32 */   const [sections, setSections] = useState<any[]>([]);
/* Line 33 */   const [loadingSections, setLoadingSections] = useState(false);
/* Line 34 */   const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
/* Line 35 */   const [isPlaying, setIsPlaying] = useState(false);
/* Line 36 */   const [progress, setProgress] = useState(0);
/* Line 37 */   const [currentTime, setCurrentTime] = useState(0);
/* Line 38 */   const [duration, setDuration] = useState(0);
/* Line 39 */   const audioRef = React.useRef<HTMLAudioElement>(null);
/* Line 40 */ 
/* Line 41 */   useEffect(() => {
/* Line 42 */     fetchBooks();
/* Line 43 */   }, []);
/* Line 44 */ 
/* Line 45 */   useEffect(() => {
/* Line 46 */     if (selectedBook) {
/* Line 47 */       fetchSections(selectedBook.id);
/* Line 48 */     } else {
/* Line 49 */       setSections([]);
/* Line 50 */       setIsPlaying(false);
/* Line 51 */       setProgress(0);
/* Line 52 */       setCurrentSectionIndex(0);
/* Line 53 */     }
/* Line 54 */   }, [selectedBook]);
/* Line 55 */ 
/* Line 56 */   useEffect(() => {
/* Line 57 */     if (audioRef.current && sections[currentSectionIndex]) {
/* Line 58 */       const url = sections[currentSectionIndex].listen_url.replace('http://', 'https://');
/* Line 59 */       audioRef.current.src = url;
/* Line 60 */       audioRef.current.load();
/* Line 61 */       if (isPlaying) {
/* Line 62 */         audioRef.current.play().catch(console.error);
/* Line 63 */       }
/* Line 64 */     }
/* Line 65 */   }, [currentSectionIndex, sections]);
/* Line 66 */ 
/* Line 67 */   const fetchSections = async (bookId: string) => {
/* Line 68 */     setLoadingSections(true);
/* Line 69 */     try {
/* Line 70 */       const res = await fetch(`/api/audiobooks/${bookId}/sections`, {
/* Line 71 */         headers: { 'Authorization': `Bearer ${token}` }
/* Line 72 */       });
/* Line 73 */       const data = await res.json();
/* Line 74 */       if (Array.isArray(data)) {
/* Line 75 */         setSections(data);
/* Line 76 */       }
/* Line 77 */     } catch (err) {
/* Line 78 */       console.error("Failed to fetch sections:", err);
/* Line 79 */     } finally {
/* Line 80 */       setLoadingSections(false);
/* Line 81 */     }
/* Line 82 */   };
/* Line 83 */ 
/* Line 84 */   const togglePlay = async () => {
/* Line 85 */     if (audioRef.current) {
/* Line 86 */       try {
/* Line 87 */         if (audioRef.current.paused) {
/* Line 88 */           await audioRef.current.play();
/* Line 89 */         } else {
/* Line 90 */           audioRef.current.pause();
/* Line 91 */         }
/* Line 92 */       } catch (err) {
/* Line 93 */         console.error("Playback error:", err);
/* Line 94 */       }
/* Line 95 */     }
/* Line 96 */   };
/* Line 97 */ 
/* Line 98 */   const handleTimeUpdate = () => {
/* Line 99 */     if (audioRef.current) {
/* Line 100 */       setCurrentTime(audioRef.current.currentTime);
/* Line 101 */       if (audioRef.current.duration) {
/* Line 102 */         const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
/* Line 103 */         setProgress(p);
/* Line 104 */       }
/* Line 105 */     }
/* Line 106 */   };
/* Line 107 */ 
/* Line 108 */   const handleLoadedMetadata = () => {
/* Line 109 */     if (audioRef.current) {
/* Line 110 */       setDuration(audioRef.current.duration);
/* Line 111 */     }
/* Line 112 */   };
/* Line 113 */ 
/* Line 114 */   const formatTime = (time: number) => {
/* Line 115 */     if (isNaN(time)) return "00:00";
/* Line 116 */     const mins = Math.floor(time / 60);
/* Line 117 */     const secs = Math.floor(time % 60);
/* Line 118 */     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
/* Line 119 */   };
/* Line 120 */ 
/* Line 121 */   const fetchBooks = async () => {
/* Line 122 */     setLoading(true);
/* Line 123 */     try {
/* Line 124 */       const res = await fetch('/api/audiobooks', {
/* Line 125 */         headers: { 'Authorization': `Bearer ${token}` }
/* Line 126 */       });
/* Line 127 */       if (res.status === 401 || res.status === 403) {
/* Line 128 */         logout();
/* Line 129 */         return;
/* Line 130 */       }
/* Line 131 */       if (!res.ok) throw new Error('Server error');
/* Line 132 */       const data = await res.json();
/* Line 133 */       if (Array.isArray(data)) {
/* Line 134 */         if (data.length > 0) {
/* Line 135 */           const apiBooks = data.filter(apiB => !FEATURED_BOOKS.some(fB => fB.title === apiB.title));
/* Line 136 */           setBooks([...FEATURED_BOOKS, ...apiBooks]);
/* Line 137 */         } else {
/* Line 138 */           setBooks(FEATURED_BOOKS);
/* Line 139 */         }
/* Line 140 */       }
/* Line 141 */     } catch (err) {
/* Line 142 */       console.error("Audiobook fetch error:", err);
/* Line 143 */     } finally {
/* Line 144 */       setLoading(false);
/* Line 145 */     }
/* Line 146 */   };
/* Line 147 */ 
/* Line 148 */   const filteredBooks = books.filter(b => 
/* Line 149 */     b.title.toLowerCase().includes(search.toLowerCase()) ||
/* Line 150 */     b.authors?.[0]?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
/* Line 151 */     b.authors?.[0]?.last_name?.toLowerCase().includes(search.toLowerCase())
/* Line 152 */   );
/* Line 153 */ 
/* Line 154 */   return (
/* Line 155 */     <div className="min-h-screen bg-stone-50 p-4 md:p-8 dark:bg-primary-950">
/* Line 156 */       <div className="max-w-7xl mx-auto">
/* Line 157 */         <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
/* Line 158 */           <div>
/* Line 159 */             <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2 dark:text-primary-50">Audio Library</h1>
/* Line 160 */             <p className="text-stone-700 dark:text-primary-400">Listen to classic spiritual and literary works.</p>
/* Line 161 */           </div>
/* Line 162 */           <div className="relative max-w-md w-full">
/* Line 163 */             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
/* Line 164 */             <Input 
/* Line 165 */               value={search}
/* Line 166 */               onChange={e => setSearch(e.target.value)}
/* Line 167 */               placeholder="Search audiobooks..."
/* Line 168 */               className="pl-10 bg-white border-stone-200 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-50"
/* Line 169 */             />
/* Line 170 */           </div>
/* Line 171 */         </header>
/* Line 172 */ 
/* Line 173 */         {loading ? (
/* Line 174 */           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
/* Line 175 */             {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
/* Line 176 */               <div key={i} className="h-64 bg-stone-200 animate-pulse rounded-2xl" />
/* Line 177 */             ))}
/* Line 178 */           </div>
/* Line 179 */         ) : (
/* Line 180 */           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
/* Line 181 */             {filteredBooks.map((book) => (
/* Line 182 */               <motion.div
/* Line 183 */                 key={book.id}
/* Line 184 */                 whileHover={{ y: -5 }}
/* Line 185 */                 className="group cursor-pointer"
/* Line 186 */                 onClick={() => setSelectedBook(book)}
/* Line 187 */               >
/* Line 188 */                 <Card className="h-full overflow-hidden flex flex-col border-stone-200 hover:border-primary-300 transition-colors dark:bg-primary-900 dark:border-primary-800 dark:hover:border-primary-600">
/* Line 189 */                   <div className="aspect-[3/4] bg-stone-100 relative overflow-hidden dark:bg-primary-950">
/* Line 190 */                     <img 
/* Line 191 */                       src={`https://picsum.photos/seed/${book.id}/400/600`} 
/* Line 192 */                       alt={book.title}
/* Line 193 */                       className="w-full h-full object-cover transition-transform group-hover:scale-105"
/* Line 194 */                       referrerPolicy="no-referrer"
/* Line 195 */                     />
/* Line 196 */                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
/* Line 197 */                       <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl">
/* Line 198 */                         <Play className="w-8 h-8 text-primary-600 fill-current ml-1" />
/* Line 199 */                       </div>
/* Line 200 */                     </div>
/* Line 201 */                     <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-stone-700 dark:bg-primary-900/90 dark:text-primary-100">
/* Line 202 */                       <Clock className="w-3 h-3" /> {book.totallistenertime || 'N/A'}
/* Line 203 */                     </div>
/* Line 204 */                   </div>
/* Line 205 */                   <div className="p-4 flex-1 flex flex-col">
/* Line 206 */                     <h3 className="font-bold text-stone-900 line-clamp-2 mb-1 group-hover:text-primary-700 transition-colors dark:text-primary-50 dark:group-hover:text-primary-400">
/* Line 207 */                       {book.title}
/* Line 208 */                     </h3>
/* Line 209 */                     <p className="text-sm text-stone-500 flex items-center gap-1 mb-4 dark:text-primary-400">
/* Line 210 */                       <User className="w-3 h-3" /> {book.authors?.[0]?.first_name} {book.authors?.[0]?.last_name}
/* Line 211 */                     </p>
/* Line 212 */                     <div className="mt-auto flex items-center justify-between">
/* Line 213 */                       <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">LibriVox</span>
/* Line 214 */                       <Headphones className="w-4 h-4 text-primary-500" />
/* Line 215 */                     </div>
/* Line 216 */                   </div>
/* Line 217 */                 </Card>
/* Line 218 */               </motion.div>
/* Line 219 */             ))}
/* Line 220 */           </div>
/* Line 221 */         )}
/* Line 222 */ 
/* Line 223 */         <AnimatePresence>
/* Line 224 */           {selectedBook && (
/* Line 225 */             <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
/* Line 226 */               <motion.div 
/* Line 227 */                 initial={{ opacity: 0 }}
/* Line 228 */                 animate={{ opacity: 1 }}
/* Line 229 */                 exit={{ opacity: 0 }}
/* Line 230 */                 onClick={() => setSelectedBook(null)}
/* Line 231 */                 className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm"
/* Line 232 */               />
/* Line 233 */               <motion.div
/* Line 234 */                 initial={{ scale: 0.9, opacity: 0, y: 20 }}
/* Line 235 */                 animate={{ scale: 1, opacity: 1, y: 0 }}
/* Line 236 */                 exit={{ scale: 0.9, opacity: 0, y: 20 }}
/* Line 237 */                 className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 dark:bg-primary-900"
/* Line 238 */               >
/* Line 239 */                 <div className="flex flex-col md:flex-row">
/* Line 240 */                   <div className="w-full md:w-1/2 aspect-square">
/* Line 241 */                     <img 
/* Line 242 */                       src={`https://picsum.photos/seed/${selectedBook.id}/600/600`} 
/* Line 243 */                       alt={selectedBook.title}
/* Line 244 */                       className="w-full h-full object-cover"
/* Line 245 */                       referrerPolicy="no-referrer"
/* Line 246 */                     />
/* Line 247 */                   </div>
/* Line 248 */                   <div className="p-8 flex-1 flex flex-col">
/* Line 249 */                     <div className="mb-6">
/* Line 250 */                       <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2 dark:text-primary-50">{selectedBook.title}</h2>
/* Line 251 */                       <p className="text-primary-700 font-medium dark:text-primary-400">
/* Line 252 */                         {selectedBook.authors?.[0]?.first_name} {selectedBook.authors?.[0]?.last_name}
/* Line 253 */                       </p>
/* Line 254 */                     </div>
/* Line 255 */                     <div className="flex-1 overflow-y-auto max-h-48 mb-6 pr-2 custom-scrollbar">
/* Line 256 */                       <p className="text-stone-600 text-sm leading-relaxed dark:text-primary-200">
/* Line 257 */                         {selectedBook.description?.replace(/<[^>]*>/g, '') || 'No description available.'}
/* Line 258 */                       </p>
/* Line 259 */                     </div>
/* Line 260 */                     <div className="space-y-4">
/* Line 261 */                       {loadingSections ? (
/* Line 262 */                         <div className="flex flex-col items-center justify-center py-8 gap-2">
/* Line 263 */                           <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
/* Line 264 */                           <span className="text-[10px] text-primary-500 font-bold uppercase tracking-widest">Loading...</span>
/* Line 265 */                         </div>
/* Line 266 */                       ) : sections.length > 0 && (
/* Line 267 */                         <div className="mb-4">
/* Line 268 */                           <h4 className="text-xs font-bold text-primary-500 uppercase mb-2">Chapters</h4>
/* Line 269 */                           <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
/* Line 270 */                             {sections.map((section, idx) => (
/* Line 271 */                               <button
/* Line 272 */                                 key={idx}
/* Line 273 */                                 onClick={() => { setCurrentSectionIndex(idx); setIsPlaying(true); }}
/* Line 274 */                                 className={`w-full text-left text-xs p-2 rounded-lg transition-colors ${currentSectionIndex === idx ? 'bg-primary-500/20 text-primary-400 font-bold' : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-primary-800'}`}
/* Line 275 */                               >
/* Line 276 */                                 {section.title || `Section ${idx + 1}`}
/* Line 277 */                               </button>
/* Line 278 */                             ))}
/* Line 279 */                           </div>
/* Line 280 */                         </div>
/* Line 281 */                       )}
/* Line 282 */                       <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => { if (currentSectionIndex < sections.length - 1) setCurrentSectionIndex(prev => prev + 1); else setIsPlaying(false); }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
/* Line 283 */                       <div className="h-1 bg-stone-100 rounded-full overflow-hidden dark:bg-primary-800 cursor-pointer" onClick={(e) => { if (audioRef.current) { const rect = e.currentTarget.getBoundingClientRect(); const p = (e.clientX - rect.left) / rect.width; audioRef.current.currentTime = p * audioRef.current.duration; } }}>
/* Line 284 */                         <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-primary-500" />
/* Line 285 */                       </div>
/* Line 286 */                       <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-widest dark:text-primary-500">
/* Line 287 */                         <span>{formatTime(currentTime)}</span>
/* Line 288 */                         <span>{formatTime(duration)}</span>
/* Line 289 */                       </div>
/* Line 290 */                       <div className="flex items-center justify-center gap-6">
/* Line 291 */                         <Button variant="ghost" size="sm" className="text-stone-400 hover:text-primary-600" onClick={() => { if (currentSectionIndex > 0) setCurrentSectionIndex(prev => prev - 1); }} disabled={currentSectionIndex === 0}><SkipBack className="w-6 h-6" /></Button>
/* Line 292 */                         <div onClick={togglePlay} className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">{isPlaying ? <Pause className="w-8 h-8 text-white fill-current" /> : <Play className="w-8 h-8 text-white fill-current ml-1" />}</div>
/* Line 293 */                         <Button variant="ghost" size="sm" className="text-stone-400 hover:text-primary-600" onClick={() => { if (currentSectionIndex < sections.length - 1) setCurrentSectionIndex(prev => prev + 1); }} disabled={currentSectionIndex === sections.length - 1}><SkipForward className="w-6 h-6" /></Button>
/* Line 294 */                       </div>
/* Line 295 */                       <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-primary-800">
/* Line 296 */                         <Button variant="ghost" size="sm" className="text-stone-400 hover:text-primary-600"><Volume2 className="w-5 h-5" /></Button>
/* Line 297 */                         <Button variant="ghost" size="sm" className="text-stone-400 hover:text-primary-600" onClick={() => window.open(selectedBook.url_librivox, '_blank')}><ExternalLink className="w-5 h-5" /></Button>
/* Line 298 */                       </div>
/* Line 299 */                     </div>
/* Line 300 */                   </div>
/* Line 301 */                 </div>
/* Line 302 */                 <button onClick={() => setSelectedBook(null)} className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
/* Line 303 */                 <button onClick={() => setSelectedBook(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"><CloseIcon className="w-6 h-6" /></button>
/* Line 304 */               </motion.div>
/* Line 305 */             </div>
/* Line 306 */           )}
/* Line 307 */         </AnimatePresence>
/* Line 308 */       </div>
/* Line 309 */     </div>
/* Line 310 */   );
/* Line 311 */ }
