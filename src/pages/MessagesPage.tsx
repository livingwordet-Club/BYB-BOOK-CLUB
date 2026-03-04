import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { MessageCircle, Send, User, Search, ArrowLeft, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function MessagesPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    if (location.state?.selectedUser) {
      setSelectedUser(location.state.selectedUser);
    }
  }, [location.state]);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchMessages();
      fetchUsers();
    }
  }, [token]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.suggestions) {
        setUsers(data.suggestions);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: selectedUser.id,
          content: newMessage
        })
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || u.username).toLowerCase().includes(search.toLowerCase())
  );

  const chatMessages = messages.filter(m => 
    (m.sender_id === selectedUser?.id && m.receiver_id === user?.id) ||
    (m.sender_id === user?.id && m.receiver_id === selectedUser?.id)
  );

  if (loading) return <div className="flex items-center justify-center h-screen">Loading Inbox...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-primary-600" /> Inbox
        </h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Users List */}
        <Card className="w-80 flex flex-col dark:bg-primary-900 dark:border-primary-800">
          <div className="p-4 border-b dark:border-primary-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
              <Input 
                placeholder="Search users..." 
                className="pl-10 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  selectedUser?.id === u.id 
                    ? 'bg-primary-100 text-primary-900 dark:bg-primary-800 dark:text-white' 
                    : 'hover:bg-stone-50 text-stone-700 dark:text-stone-300 dark:hover:bg-primary-800/50'
                }`}
              >
                <img 
                  src={u.profile_pic || `https://picsum.photos/seed/${u.username}/40`} 
                  className="w-10 h-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left">
                  <p className="font-bold text-sm">{u.name || u.username}</p>
                  <p className="text-xs opacity-60">@{u.username}</p>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-stone-400 text-sm py-8">No users found</p>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col dark:bg-primary-900 dark:border-primary-800">
          {selectedUser ? (
            <>
              <div className="p-4 border-b flex items-center justify-between dark:border-primary-800">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedUser.profile_pic || `https://picsum.photos/seed/${selectedUser.username}/40`} 
                    className="w-10 h-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="font-bold text-stone-800 dark:text-white">{selectedUser.name || selectedUser.username}</p>
                    <p className="text-xs text-stone-500">Online</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.map((m, i) => (
                  <div 
                    key={i} 
                    className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                      m.sender_id === user?.id 
                        ? 'bg-primary-600 text-white rounded-tr-none' 
                        : 'bg-stone-100 text-stone-800 rounded-tl-none dark:bg-primary-800 dark:text-stone-100'
                    }`}>
                      <p>{m.content}</p>
                      <p className={`text-[10px] mt-1 opacity-60 ${m.sender_id === user?.id ? 'text-right' : 'text-left'}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-2">
                    <MessageCircle className="w-12 h-12 opacity-20" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-primary-800 flex gap-2">
                <Input 
                  placeholder="Type a message..." 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" className="px-6">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 space-y-4">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center dark:bg-primary-800">
                <MessageCircle className="w-10 h-10 opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-bold text-stone-600 dark:text-stone-300">Your Messages</p>
                <p className="text-sm">Select a user to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
