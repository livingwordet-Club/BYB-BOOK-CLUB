import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { Users, BookOpen, Activity, Upload, MessageSquare, ShieldCheck, TrendingUp, Clock } from 'lucide-react';

export default function AdminPanel() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    cover_url: '',
    content: '',
    is_trending: false,
    is_new: true
  });

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setStats(data);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newBook)
    });
    if (res.ok) {
      alert('Book uploaded successfully!');
      setNewBook({ title: '', author: '', cover_url: '', content: '', is_trending: false, is_new: true });
      fetchStats();
    }
  };

  if (!stats) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-900 flex items-center gap-3 dark:text-primary-50">
            <ShieldCheck className="text-primary-700 dark:text-primary-400" /> Admin Dashboard
          </h1>
          <p className="text-primary-700 text-sm dark:text-primary-400">Manage the BYB MKC Spiritual Library</p>
        </div>
        <div className="bg-primary-100 text-primary-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 dark:bg-primary-800 dark:text-primary-100">
          <Activity className="w-4 h-4" /> System Online
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary-600 text-white border-none dark:bg-primary-700">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 opacity-50" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Total Users</span>
          </div>
          <div className="text-4xl font-bold">{stats.userCount}</div>
          <div className="text-sm opacity-70 mt-2">+12% from last month</div>
        </Card>
        <Card className="bg-amber-600 text-white border-none">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="w-8 h-8 opacity-50" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Total Books</span>
          </div>
          <div className="text-4xl font-bold">{stats.bookCount}</div>
          <div className="text-sm opacity-70 mt-2">5 categories</div>
        </Card>
        <Card className="bg-blue-600 text-white border-none">
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className="w-8 h-8 opacity-50" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Total Activity</span>
          </div>
          <div className="text-4xl font-bold">{stats.recentActivity.length}</div>
          <div className="text-sm opacity-70 mt-2">Last 24 hours</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Book Upload */}
        <Card className="dark:bg-primary-900 dark:border-primary-800">
          <h3 className="text-xl font-bold text-primary-900 mb-6 flex items-center gap-2 dark:text-primary-50">
            <Upload className="text-primary-600 dark:text-primary-400" /> Upload New Book
          </h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="Book Title" 
                value={newBook.title} 
                onChange={e => setNewBook({...newBook, title: e.target.value})}
                required
                className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
              />
              <Input 
                placeholder="Author" 
                value={newBook.author} 
                onChange={e => setNewBook({...newBook, author: e.target.value})}
                required
                className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
              />
            </div>
            <Input 
              placeholder="Cover Image URL" 
              value={newBook.cover_url} 
              onChange={e => setNewBook({...newBook, cover_url: e.target.value})}
              className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
            />
            <textarea 
              className="w-full px-4 py-2.5 rounded-xl border border-primary-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all min-h-[200px] dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50 dark:focus:border-primary-600"
              placeholder="Book Content (Text)..."
              value={newBook.content}
              onChange={e => setNewBook({...newBook, content: e.target.value})}
              required
            />
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={newBook.is_trending} 
                  onChange={e => setNewBook({...newBook, is_trending: e.target.checked})}
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-sm text-primary-700 flex items-center gap-1 dark:text-primary-300"><TrendingUp className="w-3 h-3" /> Trending</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={newBook.is_new} 
                  onChange={e => setNewBook({...newBook, is_new: e.target.checked})}
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-sm text-primary-700 flex items-center gap-1 dark:text-primary-300"><Clock className="w-3 h-3" /> New Release</span>
              </label>
            </div>
            <Button type="submit" className="w-full">Upload to Library</Button>
          </form>
        </Card>

        {/* User Activity */}
        <Card className="flex flex-col dark:bg-primary-900 dark:border-primary-800">
          <h3 className="text-xl font-bold text-primary-900 mb-6 flex items-center gap-2 dark:text-primary-50">
            <Activity className="text-primary-600 dark:text-primary-400" /> Recent Activity Feed
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-2">
            {stats.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-4 p-3 bg-primary-50 rounded-xl dark:bg-primary-950">
                <div className="p-2 bg-white rounded-lg shadow-sm dark:bg-primary-800">
                  <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-primary-900 dark:text-primary-100">
                    <span className="font-bold">@{a.username}</span> saved a {a.type}
                  </p>
                  <p className="text-xs text-primary-500 mt-1 dark:text-primary-400">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* User Management */}
      <Card className="dark:bg-primary-900 dark:border-primary-800">
        <h3 className="text-xl font-bold text-primary-900 mb-6 flex items-center gap-2 dark:text-primary-50">
          <Users className="text-primary-600 dark:text-primary-400" /> User Directory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-primary-600 text-sm border-b border-primary-100 dark:text-primary-400 dark:border-primary-800">
                <th className="pb-4 font-bold">Username</th>
                <th className="pb-4 font-bold">Name</th>
                <th className="pb-4 font-bold">Email</th>
                <th className="pb-4 font-bold">Role</th>
                <th className="pb-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 dark:divide-primary-800">
              {stats.allUsers.map((u: any) => (
                <tr key={u.id} className="text-sm text-primary-900 group dark:text-primary-100">
                  <td className="py-4 font-medium">@{u.username}</td>
                  <td className="py-4">{u.name || '—'}</td>
                  <td className="py-4">{u.email || '—'}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${u.is_admin ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-primary-100 text-primary-600 dark:bg-primary-800 dark:text-primary-400'}`}>
                      {u.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="py-4">
                    <Button variant="ghost" size="sm" className="text-primary-400 group-hover:text-primary-600 dark:group-hover:text-primary-300">Message</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
