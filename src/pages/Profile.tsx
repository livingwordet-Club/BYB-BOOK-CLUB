import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { 
  User, 
  Mail, 
  Book, 
  Save, 
  Trash2, 
  Camera, 
  Heart, 
  Settings, 
  Grid, 
  Bookmark, 
  AtSign,
  Link as LinkIcon,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const { token, user, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    profile_verse: '',
    profile_pic: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'activity'>('posts');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(response.data);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await axios.put('/api/user/profile', profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-primary-600">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 pb-20">
      {/* Instagram-style Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 py-8">
        <div className="relative group">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-primary-500 to-primary-600">
            <div className="w-full h-full rounded-full bg-white dark:bg-primary-900 p-1">
              <div className="w-full h-full rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-5xl font-bold overflow-hidden dark:bg-primary-800">
                {profile.profile_pic ? (
                  <img src={profile.profile_pic} alt={user?.username} className="w-full h-full object-cover" />
                ) : (
                  profile.name ? profile.name[0] : user?.username[0]
                )}
              </div>
            </div>
          </div>
          <button className="absolute bottom-2 right-2 bg-primary-600 text-white p-2 rounded-full shadow-lg hover:bg-primary-700 transition-colors border-2 border-white dark:border-primary-900">
            <Camera size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h1 className="text-2xl font-light text-primary-900 dark:text-primary-50">{user?.username}</h1>
            <div className="flex gap-2 justify-center md:justify-start">
              <Button size="sm" variant="outline" className="h-8 px-4 text-xs font-bold">Edit Profile</Button>
              <Button size="sm" variant="outline" className="h-8 px-4 text-xs font-bold" onClick={logout}>
                <LogOut size={14} className="mr-1" /> Logout
              </Button>
            </div>
          </div>

          <div className="flex justify-center md:justify-start gap-8 text-sm">
            <div><span className="font-bold">12</span> posts</div>
            <div><span className="font-bold">48</span> followers</div>
            <div><span className="font-bold">156</span> following</div>
          </div>

          <div className="space-y-1">
            <h2 className="font-bold text-primary-900 dark:text-primary-50">{profile.name || user?.username}</h2>
            <p className="text-sm text-primary-600 dark:text-primary-400 whitespace-pre-wrap">{profile.bio || 'Spiritual seeker & Book lover'}</p>
            {profile.profile_verse && (
              <div className="flex items-center gap-1 text-primary-500 text-sm font-medium">
                <Heart size={14} className="text-primary-600" />
                <span>{profile.profile_verse}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-primary-100 dark:border-primary-800">
        <div className="flex justify-center gap-12 -mt-px">
          <TabButton 
            active={activeTab === 'posts'} 
            onClick={() => setActiveTab('posts')} 
            icon={<Grid size={14} />} 
            label="POSTS" 
          />
          <TabButton 
            active={activeTab === 'saved'} 
            onClick={() => setActiveTab('saved')} 
            icon={<Bookmark size={14} />} 
            label="SAVED" 
          />
          <TabButton 
            active={activeTab === 'activity'} 
            onClick={() => setActiveTab('activity')} 
            icon={<AtSign size={14} />} 
            label="ACTIVITY" 
          />
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'posts' && (
          <motion.div 
            key="posts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-1 md:gap-4"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-primary-100 dark:bg-primary-800 relative group cursor-pointer overflow-hidden rounded-sm md:rounded-lg">
                <img 
                  src={`https://picsum.photos/seed/post${i}/500/500`} 
                  alt="Post" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold">
                  <div className="flex items-center gap-1"><Heart size={18} fill="white" /> 24</div>
                  <div className="flex items-center gap-1"><Bookmark size={18} fill="white" /> 8</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div 
            key="activity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <Card className="p-0 overflow-hidden">
              <div className="p-6 space-y-6">
                <h3 className="font-bold text-lg text-primary-900 dark:text-primary-50">Edit Profile Details</h3>
                <form onSubmit={handleSave} className="space-y-6">
                  {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}
                  {success && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm border border-emerald-100">{success}</div>}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary-500 uppercase tracking-wider">Full Name</label>
                      <Input 
                        value={profile.name} 
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className="bg-primary-50/50 dark:bg-primary-950/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary-500 uppercase tracking-wider">Email</label>
                      <Input 
                        type="email" 
                        value={profile.email} 
                        onChange={(e) => setProfile({...profile, email: e.target.value})}
                        className="bg-primary-50/50 dark:bg-primary-950/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary-500 uppercase tracking-wider">Bio</label>
                      <textarea 
                        className="w-full px-4 py-3 rounded-xl border border-primary-100 bg-primary-50/50 backdrop-blur-md focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all dark:bg-primary-950/50 dark:border-primary-800 dark:text-primary-50 h-32 resize-none"
                        value={profile.bio}
                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary-500 uppercase tracking-wider">Profile Verse</label>
                      <Input 
                        value={profile.profile_verse} 
                        onChange={(e) => setProfile({...profile, profile_verse: e.target.value})}
                        placeholder="e.g. Philippians 4:13"
                        className="bg-primary-50/50 dark:bg-primary-950/50"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full md:w-auto px-8" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 py-4 border-t-2 transition-all text-xs font-bold tracking-widest ${
        active 
          ? 'border-primary-900 text-primary-900 dark:border-primary-50 dark:text-primary-50' 
          : 'border-transparent text-primary-400 hover:text-primary-600'
      }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
