import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { ArrowLeft, Save, User, Heart, MessageSquare } from 'lucide-react';
import axios from 'axios';

export default function ProfileSetup() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    profile_verse: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
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
    try {
      await axios.put('/api/user/profile', profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/profile');
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-primary-900 dark:text-primary-50">Profile Setup</h1>
      </div>

      <Card className="p-6 dark:bg-primary-900 dark:border-primary-800">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary-500 uppercase tracking-wider flex items-center gap-2">
              <User size={14} /> Full Name
            </label>
            <Input 
              value={profile.name} 
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-primary-50 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={14} /> Bio
            </label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl border border-primary-100 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50 h-32 resize-none"
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              placeholder="Tell the community about your spiritual journey..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-primary-500 uppercase tracking-wider flex items-center gap-2">
              <Heart size={14} /> Favorite Verse
            </label>
            <Input 
              value={profile.profile_verse} 
              onChange={(e) => setProfile({...profile, profile_verse: e.target.value})}
              placeholder="e.g. John 3:16"
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
