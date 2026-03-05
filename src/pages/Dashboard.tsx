import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { Book, TrendingUp, Clock, MessageCircle, UserPlus, BookOpen, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data && !data.error) {
            setData(data);
          }
        } else if (res.status === 401 || res.status === 403) {
          logout();
        }
      } catch (err) {
        console.error("Failed to fetch dashboard:", err);
      }
    };

    fetchData();

    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, [token, logout]);

  if (!data) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/90 backdrop-blur-md"
          >
            <div className="text-center text-white p-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-6"
              >
                <BookOpen className="w-24 h-24" />
              </motion.div>
              <h1 className="text-5xl font-bold mb-4">Welcome to BYB MKC</h1>
              <p className="text-2xl text-primary-300 italic">Your Spiritual Book Library</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-primary-50 flex items-center gap-2">
                <TrendingUp className="text-primary-400" /> Trending Books
              </h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.trending.map((book: any) => (
                <Card key={book.id} className="group cursor-pointer border-primary-800 hover:border-primary-600 transition-all">
                  <div className="flex gap-4">
                    <img 
                      src={book.cover_url || 'https://picsum.photos/seed/book/100/150'} 
                      alt={book.title}
                      className="w-24 h-32 object-cover rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-primary-50 group-hover:text-primary-400 transition-colors">{book.title}</h3>
                        <p className="text-sm text-primary-400">{book.author}</p>
                      </div>
                      <Button size="sm" variant="outline" className="w-fit" onClick={() => navigate('/books')}>Read Now</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-50 flex items-center gap-2 mb-4">
              <Clock className="text-primary-400" /> New Updates
            </h2>
            <div className="space-y-4">
              {data.updates.map((book: any) => (
                <Card key={book.id} onClick={() => navigate('/books')} className="flex items-center justify-between hover:bg-primary-900/50 cursor-pointer border-primary-800">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary-800 rounded-lg">
                      <Book className="text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary-50">{book.title}</h3>
                      <p className="text-xs text-primary-400">Added {new Date(book.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-primary-600" />
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {data.currentRead && (
            <Card className="bg-primary-950 text-white border-none shadow-xl">
              <h3 className="text-primary-500 text-sm font-bold uppercase tracking-wider mb-4">Currently Reading</h3>
              <div className="flex gap-4">
                <img src={data.currentRead.cover_url} className="w-16 h-24 rounded shadow-lg" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="font-bold text-lg">{data.currentRead.title}</h4>
                  <p className="text-primary-400 text-sm mb-4">{data.currentRead.author}</p>
                  <Button size="sm" className="bg-primary-100 text-primary-950 hover:bg-primary-200" onClick={() => navigate('/books')}>Continue</Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-primary-800 bg-primary-900/20">
            <h3 className="text-primary-50 font-bold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary-400" /> Messages
            </h3>
            <div className="space-y-4">
              {data.recentMessages && data.recentMessages.length > 0 ? (
                data.recentMessages.map((msg: any) => (
                  <div 
                    key={msg.id} 
                    className="flex items-center gap-3 p-2 hover:bg-primary-800/50 rounded-xl cursor-pointer transition-colors group"
                    onClick={() => navigate('/messages', { state: { selectedUser: { id: msg.sender_id, username: msg.sender_name, profile_pic: msg.sender_pic } } })}
                  >
                    <img src={msg.sender_pic || 'https://picsum.photos/seed/user/40'} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-primary-100 truncate">{msg.sender_name}</p>
                      <p className="text-[10px] text-primary-400 truncate">{msg.content}</p>
                    </div>
                    <span className="text-[8px] text-primary-600">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-primary-400 italic">No recent messages</p>
              )}
              <Button variant="outline" className="w-full" onClick={() => navigate('/messages')}>Open Inbox</Button>
            </div>
          </Card>

          <Card className="border-primary-800 bg-primary-900/20">
            <h3 className="text-primary-50 font-bold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-400" /> Friend Suggestions
            </h3>
            <div className="space-y-4">
              {data.suggestions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate('/profile', { state: { selectedFriend: s } })}
                  >
                    <img src={s.profile_pic || 'https://picsum.photos/seed/user/40'} className="w-10 h-10 rounded-full object-cover ring-primary-500 transition-all" referrerPolicy="no-referrer" />
                    <span className="text-sm font-medium text-primary-100 group-hover:text-primary-400 transition-colors">{s.name || s.username}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="p-2"
                    onClick={() => navigate('/profile', { state: { selectedFriend: s } })}
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
