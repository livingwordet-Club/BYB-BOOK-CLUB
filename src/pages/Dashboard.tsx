import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { Button, Card } from '../components/UI';
import { BookOpen, Users, TrendingUp, MessageSquare, UserPlus, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface Stats {
  totalUsers: number;
  totalBooks: number;
  activeReaders: number;
}

interface Suggestion {
  id: number;
  username: string;
  name: string;
  profile_pic: string;
}

interface Activity {
  id: number;
  user_id: number;
  username: string;
  name: string;
  profile_pic: string;
  action_type: string;
  description: string;
  created_at: string;
}

export default function Dashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityStats, setActivityStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data.stats);
        setSuggestions(response.data.suggestions);
        setTrendingBooks(response.data.trendingBooks);
        setRecentMessages(response.data.recentMessages);
        setActivityStats(response.data.activityStats);
      } catch (err) {
        console.error('Failed to fetch dashboard', err);
      }
    };

    const fetchActivities = async () => {
      try {
        const response = await axios.get('/api/activities', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActivities(response.data);
      } catch (err) {
        console.error('Failed to fetch activities', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    fetchActivities();
  }, [token]);

  if (loading) return <div className="p-8 text-center text-primary-600">Loading Dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-900 dark:text-primary-50">Welcome, {user?.name || user?.username}!</h1>
          <p className="text-primary-600 dark:text-primary-400 font-medium">Your Spiritual Book Library</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Heart size={18} /> Daily Verse
          </Button>
          <Button variant="primary" size="sm" className="flex items-center gap-2">
            <BookOpen size={18} /> Start Reading
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Users className="text-blue-500" />} label="Total Users" value={stats?.totalUsers || 0} />
        <StatCard icon={<BookOpen className="text-emerald-500" />} label="Total Books" value={stats?.totalBooks || 0} />
        <StatCard icon={<TrendingUp className="text-amber-500" />} label="Active Readers" value={stats?.activeReaders || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Activity Tracker Visualization */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-primary-100">
              <TrendingUp size={20} className="text-primary-600" /> Activity Tracker
            </h2>
            <Card className="p-6">
              <div className="flex items-end gap-2 h-32">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const dayData = activityStats[i] || { count: 0 };
                  const height = Math.min(100, (dayData.count / 10) * 100);
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary-100 rounded-t-lg relative group dark:bg-primary-800" style={{ height: '100%' }}>
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          className="absolute bottom-0 left-0 right-0 bg-primary-600 rounded-t-lg"
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {dayData.count} actions
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary-400 uppercase">{day}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-primary-100">
              <TrendingUp size={20} className="text-primary-600" /> Trending Books
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trendingBooks.map((book) => (
                <Card key={book.id} className="flex gap-4 p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="w-20 h-28 bg-primary-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-primary-400 dark:bg-primary-800">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <BookOpen size={32} />
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-bold text-primary-900 dark:text-primary-50 line-clamp-1">{book.title}</h3>
                    <p className="text-sm text-primary-600 dark:text-primary-400">{book.author}</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-500 font-bold">
                      <TrendingUp size={12} /> Popular this week
                    </div>
                  </div>
                </Card>
              ))}
              {trendingBooks.length === 0 && (
                <p className="text-sm text-primary-400 italic">No books uploaded yet</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-primary-100">
              <MessageSquare size={20} className="text-primary-600" /> Recent Messages
            </h2>
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-primary-50 dark:border-primary-800 flex items-center justify-between">
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Latest conversations</span>
                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
              </div>
              <div className="divide-y divide-primary-50 dark:divide-primary-800">
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="p-4 flex items-center gap-4 hover:bg-primary-50 transition-colors dark:hover:bg-primary-900/50">
                    <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-bold dark:bg-primary-700 dark:text-primary-200">
                      {msg.sender_pic ? (
                        <img src={msg.sender_pic} alt={msg.sender_username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        msg.sender_name ? msg.sender_name[0] : msg.sender_username[0]
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-primary-900 dark:text-primary-50">{msg.sender_name || msg.sender_username}</h4>
                      <p className="text-xs text-primary-600 truncate dark:text-primary-400">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-primary-400">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {recentMessages.length === 0 && (
                  <p className="p-8 text-center text-primary-400 italic text-sm">No recent messages</p>
                )}
              </div>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-primary-100">
              <TrendingUp size={20} className="text-primary-600" /> Recent Activity
            </h2>
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-primary-50 dark:divide-primary-800">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-4 flex gap-3 hover:bg-primary-50 transition-colors dark:hover:bg-primary-900/50">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs flex-shrink-0 dark:bg-primary-800">
                      {activity.profile_pic ? (
                        <img src={activity.profile_pic} alt={activity.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        activity.username[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-primary-900 dark:text-primary-50">
                        <span className="font-bold">{activity.name || activity.username}</span> {activity.description}
                      </p>
                      <p className="text-[10px] text-primary-400 mt-1">
                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="p-8 text-center text-primary-400 italic text-sm">No activity yet</p>
                )}
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-primary-100">
              <UserPlus size={20} className="text-primary-600" /> Friend Suggestions
            </h2>
            <Card className="space-y-4">
              {suggestions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold dark:bg-primary-800 dark:text-primary-300">
                      {s.name ? s.name[0] : s.username[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary-900 dark:text-primary-50">{s.name || s.username}</h4>
                      <p className="text-[10px] text-primary-500 dark:text-primary-400">Active Reader</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="px-3 py-1 text-xs">Follow</Button>
                </div>
              ))}
              {suggestions.length === 0 && (
                <p className="text-sm text-primary-400 text-center py-4 italic">No suggestions yet</p>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex items-center gap-4 p-6 hover:scale-[1.02] transition-transform">
      <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-2xl dark:bg-primary-800">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{label}</p>
        <p className="text-2xl font-bold text-primary-900 dark:text-primary-50">{value.toLocaleString()}</p>
      </div>
    </Card>
  );
}

function CardSection({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}
