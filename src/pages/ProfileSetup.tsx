import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Card } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Book, Image as ImageIcon, Save, ArrowLeft } from 'lucide-react';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { token, user, login } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    profile_verse: '',
    profile_pic: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setProfile(data);
        }
      })
      .catch(err => console.error("Failed to fetch profile:", err));
    }
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        alert('Profile updated successfully!');
        // Update local user name if changed
        if (user) {
          login(token!, { ...user, name: profile.name });
        }
      }
    } catch (err) {
      alert('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/profile')} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Button>
      </div>
      <Card className="dark:bg-primary-900 dark:border-primary-800">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary-100 rounded-2xl dark:bg-primary-800">
            <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary-900 dark:text-primary-50">Profile Setup</h1>
            <p className="text-primary-600 dark:text-primary-400">Tell us more about yourself</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-300">
                <User className="w-4 h-4" /> Full Name
              </label>
              <Input 
                value={profile.name} 
                onChange={e => setProfile({...profile, name: e.target.value})}
                placeholder="John Doe"
                className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-300">
                <Mail className="w-4 h-4" /> Email
              </label>
              <Input 
                type="email"
                value={profile.email} 
                onChange={e => setProfile({...profile, email: e.target.value})}
                placeholder="john@example.com"
                className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-300">
              <ImageIcon className="w-4 h-4" /> Profile Picture URL
            </label>
            <Input 
              value={profile.profile_pic} 
              onChange={e => setProfile({...profile, profile_pic: e.target.value})}
              placeholder="https://images.unsplash.com/..."
              className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
            />
            {profile.profile_pic && (
              <div className="mt-2 flex justify-center">
                <img 
                  src={profile.profile_pic} 
                  alt="Preview" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 shadow-lg dark:border-primary-800"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-300">
              <Book className="w-4 h-4" /> Favorite Bible Verse
            </label>
            <Input 
              value={profile.profile_verse} 
              onChange={e => setProfile({...profile, profile_verse: e.target.value})}
              placeholder="John 3:16"
              className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-300">
              Bio
            </label>
            <textarea 
              className="w-full px-4 py-2.5 rounded-xl border border-primary-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all min-h-[120px] dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50 dark:focus:border-primary-600"
              value={profile.bio} 
              onChange={e => setProfile({...profile, bio: e.target.value})}
              placeholder="Write a little about your spiritual journey..."
            />
          </div>

          <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={isSaving}>
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
