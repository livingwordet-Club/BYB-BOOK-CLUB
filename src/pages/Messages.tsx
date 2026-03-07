import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { Search, Send, User, MessageSquare, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

interface Conversation {
  other_id: number;
  username: string;
  name: string;
  profile_pic: string;
  last_message: string;
  last_message_time: string;
}

export default function Messages() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    if (user) {
      newSocket.emit('join', user.id);
    }

    newSocket.on('receive_message', (message: Message) => {
      if (activeChat && (message.sender_id === activeChat.other_id || message.receiver_id === activeChat.other_id)) {
        setMessages(prev => [...prev, message]);
      }
      fetchConversations();
    });

    newSocket.on('message_sent', (message: Message) => {
      setMessages(prev => [...prev, message]);
      fetchConversations();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, activeChat]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  useEffect(() => {
    if (activeChat) {
      const fetchMessages = async () => {
        try {
          const response = await axios.get(`/api/messages/${activeChat.other_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMessages(response.data);
        } catch (err) {
          console.error('Failed to fetch messages', err);
        }
      };
      fetchMessages();
    }
  }, [activeChat, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !socket || !user) return;

    socket.emit('send_message', {
      senderId: user.id,
      receiverId: activeChat.other_id,
      content: newMessage
    });

    setNewMessage('');
  };

  if (loading) return <div className="p-8 text-center text-primary-600">Loading Conversations...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 h-[calc(100vh-120px)]">
      <div className="bg-white rounded-2xl shadow-sm border border-primary-100 overflow-hidden flex h-full dark:bg-primary-900 dark:border-primary-800">
        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-primary-100 flex flex-col dark:border-primary-800 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-primary-100 dark:border-primary-800">
            <h2 className="text-xl font-bold text-primary-900 dark:text-primary-50 flex items-center gap-2">
              <MessageSquare className="text-primary-600" size={20} /> Messages
            </h2>
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={16} />
              <Input placeholder="Search chats..." className="pl-10 h-10 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-primary-50 dark:divide-primary-800">
            {conversations.map((conv) => (
              <button
                key={conv.other_id}
                onClick={() => setActiveChat(conv)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-primary-50 transition-colors text-left dark:hover:bg-primary-950/50 ${activeChat?.other_id === conv.other_id ? 'bg-primary-50 dark:bg-primary-950/50' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg dark:bg-primary-800 dark:text-primary-300">
                  {conv.profile_pic ? (
                    <img src={conv.profile_pic} alt={conv.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    conv.name ? conv.name[0] : conv.username[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-primary-900 dark:text-primary-50 truncate">{conv.name || conv.username}</h4>
                    <span className="text-[10px] text-primary-400">
                      {new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-primary-500 truncate dark:text-primary-400">{conv.last_message}</p>
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-primary-400 italic text-sm">No conversations yet</div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-primary-50/30 dark:bg-primary-950/30 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-primary-100 flex items-center gap-3 dark:bg-primary-900 dark:border-primary-800">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-primary-600">
                  <ArrowLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold dark:bg-primary-800">
                  {activeChat.profile_pic ? (
                    <img src={activeChat.profile_pic} alt={activeChat.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    activeChat.name ? activeChat.name[0] : activeChat.username[0]
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-primary-900 dark:text-primary-50">{activeChat.name || activeChat.username}</h3>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Online</p>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                        msg.sender_id === user?.id 
                          ? 'bg-primary-600 text-white rounded-tr-none' 
                          : 'bg-white text-primary-900 rounded-tl-none dark:bg-primary-800 dark:text-primary-50'
                      }`}>
                        <p>{msg.content}</p>
                        <span className={`text-[10px] mt-1 block ${msg.sender_id === user?.id ? 'text-primary-100' : 'text-primary-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-primary-100 dark:bg-primary-900 dark:border-primary-800">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" className="px-4">
                    <Send size={20} />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-primary-400 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-4 dark:bg-primary-800">
                <MessageSquare size={40} />
              </div>
              <h3 className="text-xl font-bold text-primary-900 dark:text-primary-50 mb-2">Your Messages</h3>
              <p className="max-w-xs">Select a conversation from the sidebar to start chatting with other members.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
