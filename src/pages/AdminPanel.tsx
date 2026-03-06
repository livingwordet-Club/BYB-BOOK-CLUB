import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { Users, BookOpen, Activity, Upload, MessageSquare, ShieldCheck, TrendingUp, Clock, FileText } from 'lucide-react';

export default function AdminPanel() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    cover_url: '',
    category: 'Spiritual',
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

  // ONLY USE THIS VERSION OF HANDLEUPLOAD
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookFile) return alert("Please select a book file first!");

    const formData = new FormData();
    formData.append('file', bookFile); // The actual PDF/EPUB file
    formData.append('title', newBook.title);
    formData.append('author', newBook.author);
    formData.append('cover_url', newBook.cover_url);

    const res = await fetch('/api/books/upload', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
        // IMPORTANT: No 'Content-Type' header here!
      },
      body: formData
    });

    if (res.ok) {
      alert('Book and file uploaded successfully!');
      setNewBook({ title: '', author: '', cover_url: '', category: 'Spiritual' });
      setBookFile(null);
      fetchStats();
    } else {
      alert('Upload failed. Please check the file size and type.');
    }
  };

  if (!stats) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-900 flex items-center gap-3 dark:text-primary-50">
            <ShieldCheck className="text-primary-700 dark:text-primary-400" /> Admin Dashboard
          </h1>
          <p className="text-primary-700 text-sm dark:text-primary-400">Manage the BYB MKC Spiritual Library</p>
        </div>
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 dark:bg-green-900/30 dark:text-green-400">
          <Activity className="w-4 h-4" /> System Online
        </div>
      </div>

      {/* 2. Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary-600 text-white border-none">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 opacity-50" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Total Users</span>
          </div>
          <div className="text-4xl font-bold">{stats.userCount}</div>
        </Card>
        <Card className="bg-amber-600 text-white border-none">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="w-8 h-8 opacity-50" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Total Books</span>
          </div>
          <div className="text-4xl font-bold">{stats.bookCount}</div>
        </Card>
        <Card className="bg-blue-600 text-white border-none">
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className="w-8 h-8 opacity-50" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Recent Activity</span>
          </div>
          <div className="text-4xl font-bold">{stats.recentActivity.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 3. Book Upload Section */}
        <Card className="dark:bg-primary-900 dark:border-primary-800">
          <h3 className="text-xl font-bold text-primary-900 mb-6 flex items-center gap-2 dark:text-primary-50">
            <Upload className="text-primary-600 dark:text-primary-400" /> Upload New Book File
          </h3>
          
          <form onSubmit={handleUpload} className="space-y-4">
            {/* File Dropzone */}
            <div className="border-2 border-dashed border-primary-200 rounded-xl p-8 text-center hover:border-primary-500 transition-colors dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/50">
              <input 
                type="file" 
                id="file-upload"
                className="hidden" 
                accept=".pdf,.epub,.mobi"
                onChange={(e) => setBookFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileText className={`w-12 h-12 mx-auto mb-2 ${bookFile ? 'text-green-500' : 'text-primary-400'}`} />
                <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {bookFile ? bookFile.name : "Select PDF, EPUB, or MOBI"}
                </p>
                {bookFile && <p className="text-xs text-green-600 mt-1 font-bold">File Ready!</p>}
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="Book Title" 
                value={newBook.title} 
                onChange={e => setNewBook({...newBook, title: e.target.value})}
                required
              />
              <Input 
                placeholder="Author" 
                value={newBook.author} 
                onChange={e => setNewBook({...newBook, author: e.target.value})}
                required
              />
            </div>
            
            <Input 
              placeholder="Cover Image URL (e.g. https://...)" 
              value={newBook.cover_url} 
              onChange={e => setNewBook({...newBook, cover_url: e.target.value})}
            />

            <Button type="submit" className="w-full" disabled={!bookFile}>
              Confirm & Upload to Library
            </Button>
          </form>
        </Card>

        {/* 4. Activity Feed Section */}
        <Card className="flex flex-col dark:bg-primary-900 dark:border-primary-800">
          <h3 className="text-xl font-bold text-primary-900 mb-6 flex items-center gap-2 dark:text-primary-50">
            <Activity className="text-primary-600 dark:text-primary-400" /> Recent Activity Feed
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 max-h-[450px] pr-2">
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

      {/* 5. User Directory Section */}
      <Card className="dark:bg-primary-900 dark:border-primary-800">
        <h3 className="text-xl font-bold text-primary-900 mb-6 flex items-center gap-2 dark:text-primary-50">
          <Users className="text-primary-600 dark:text-primary-400" /> User Directory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-primary-600 text-sm border-b border-primary-100 dark:text-primary-400 dark:border-primary-800">
                <th className="pb-4 font-bold">Username</th>
                <th className="pb-4 font-bold">Role</th>
                <th className="pb-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 dark:divide-primary-800">
              {stats.allUsers.map((u: any) => (
                <tr key={u.id} className="text-sm text-primary-900 group dark:text-primary-100">
                  <td className="py-4 font-medium">@{u.username}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${u.is_admin ? 'bg-purple-100 text-purple-600' : 'bg-primary-100 text-primary-600'}`}>
                      {u.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="py-4">
                    <Button variant="ghost" size="sm">Message</Button>
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
