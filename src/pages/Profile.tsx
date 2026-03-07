import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from '../components/UI';
import { User, Mail, Book, Heart, Bookmark, Highlighter, Quote, MessageCircle, X, ChevronRight, Settings, Trash2, Check, ArrowLeft, Camera, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import Cropper from 'react-easy-crop';

// Helper to create an image from a URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

// Helper to get the cropped image as a blob
async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg');
  });
}

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user: authUser, logout } = useAuth();
  const { themeColor, setThemeColor, isDarkMode, toggleDarkMode } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result as string);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleUploadCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Failed to crop image');

      const formData = new FormData();
      formData.append('image', croppedImageBlob, 'profile-pic.jpg');

      const res = await fetch('/api/user/profile-pic', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setProfile({ ...profile, profile_pic: data.url });
        setImageToCrop(null);
      } else {
        alert('Failed to upload image');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (location.state?.selectedFriend) {
      setSelectedFriend(location.state.selectedFriend);
    }
  }, [location.state]);

  const themeColors = [
    { name: 'Emerald', value: 'emerald', hex: '#10b981' },
    { name: 'Blue', value: 'blue', hex: '#3b82f6' },
    { name: 'Brown', value: 'brown', hex: '#78350f' },
    { name: 'Orange', value: 'orange', hex: '#f97316' },
    { name: 'Yellow', value: 'yellow', hex: '#eab308' },
    { name: 'Red', value: 'red', hex: '#ef4444' },
    { name: 'Pink', value: 'pink', hex: '#ec4899' },
    { name: 'Purple', value: 'purple', hex: '#a855f7' },
    { name: 'Gray', value: 'gray', hex: '#6b7280' },
  ];

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      try {
        const res = await fetch('/api/user/delete', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          alert('Account deleted successfully.');
          logout();
        }
      } catch (err) {
        alert('Failed to delete account.');
      }
    }
  };

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      setError(null);
      
      const fetchProfile = async () => {
        try {
          const res = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            console.error("Non-JSON response:", text);
            throw new Error('Server returned an invalid response. Please try again.');
          }

          const data = await res.json();
          
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              logout();
              return;
            }
            throw new Error(data.error || 'Failed to fetch profile');
          }

          if (data && !data.error) {
            setProfile(data);
          } else {
            throw new Error('Invalid profile data received');
          }
        } catch (err: any) {
          console.error("Profile fetch error:", err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();

      fetch('/api/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(setActivity)
      .catch(err => console.error("Activity fetch error:", err));

      fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.suggestions) {
          setFriends(data.suggestions);
        }
      })
      .catch(err => console.error("Failed to fetch friends:", err));
    }
  }, [token]);

  if (isLoading) return <div className="flex items-center justify-center h-screen text-stone-600 dark:text-stone-300">Loading your spiritual profile...</div>;
  
  if (error || !profile) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <p className="text-red-500 font-bold">Error: {error || 'Profile not found'}</p>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );

  const stats = [
    { label: 'Bookmarks', count: (activity || []).filter(a => a.type === 'bookmark').length, icon: Bookmark, color: 'text-blue-600' },
    { label: 'Quotes', count: (activity || []).filter(a => a.type === 'quote').length, icon: Quote, color: 'text-purple-600' },
    { label: 'Highlights', count: (activity || []).filter(a => a.type === 'highlight').length, icon: Highlighter, color: 'text-yellow-600' },
    { label: 'Prayers', count: (activity || []).filter(a => a.type === 'prayer').length, icon: Heart, color: 'text-red-600' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Profile Header */}
      <Card className="bg-primary-900 text-white border-none overflow-hidden relative dark:bg-primary-950">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-800 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 dark:bg-primary-900" />
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative group">
            <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-3xl overflow-hidden border-4 border-primary-800 shadow-2xl dark:border-primary-900">
              <img 
                src={profile.profile_pic || 'https://picsum.photos/seed/user/200'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 backdrop-blur-sm">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                <Camera className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                  {uploading ? 'Processing...' : 'Upload Photo'}
                </span>
              </label>
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl z-20">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-bold mb-2">{profile.name || profile.username}</h1>
            <p className="text-primary-300 font-serif italic mb-4 dark:text-primary-400">"{profile.profile_verse || 'Seek first the kingdom of God...'}"</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2 bg-primary-800/50 px-4 py-2 rounded-xl text-sm dark:bg-primary-900/50">
                <Mail className="w-4 h-4" /> {profile.email || 'No email set'}
              </div>
              <div className="flex items-center gap-2 bg-primary-800/50 px-4 py-2 rounded-xl text-sm dark:bg-primary-900/50">
                <User className="w-4 h-4" /> @{profile.username}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(true)}
              className="border-primary-400 text-primary-400 hover:bg-primary-800 dark:border-primary-600 dark:text-primary-600 dark:hover:bg-primary-900"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/profile/setup')}
              className="border-primary-400 text-primary-400 hover:bg-primary-800 dark:border-primary-600 dark:text-primary-600 dark:hover:bg-primary-900"
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Bio */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(stat => (
              <Card key={stat.label} className="text-center hover:shadow-md transition-shadow dark:bg-primary-900 dark:border-primary-800">
                <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">{stat.count}</div>
                <div className="text-xs text-primary-700 uppercase tracking-wider font-bold dark:text-primary-400">{stat.label}</div>
              </Card>
            ))}
          </div>

          <Card className="dark:bg-primary-900 dark:border-primary-800">
            <h3 className="text-xl font-bold text-primary-900 mb-4 dark:text-primary-50">About Me</h3>
            <p className="text-primary-800 leading-relaxed dark:text-primary-300">
              {profile.bio || "This user hasn't written a bio yet. They are likely busy reading spiritual books and meditating on the Word."}
            </p>
          </Card>

          <Card className="dark:bg-primary-900 dark:border-primary-800">
            <h3 className="text-xl font-bold text-primary-900 mb-4 dark:text-primary-50">Recent Activity</h3>
            <div className="space-y-4">
              {(activity || []).slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center gap-4 p-3 hover:bg-primary-50 rounded-xl transition-colors dark:hover:bg-primary-800">
                  <div className="p-2 bg-primary-100 rounded-lg dark:bg-primary-800">
                    <Book className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-primary-900 font-medium dark:text-primary-100">{a.description || `Performed a ${a.type}`}</p>
                    <p className="text-xs text-primary-600 dark:text-primary-400">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary-400 dark:text-primary-600" />
                </div>
              ))}
              {(!activity || activity.length === 0) && <p className="text-primary-500 italic text-center py-4 dark:text-primary-400">No activity yet</p>}
            </div>
          </Card>
        </div>

        {/* Right Column: Friends */}
        <div className="space-y-8">
          <Card className="dark:bg-primary-900 dark:border-primary-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-primary-900 dark:text-primary-50">Friends</h3>
              <span className="bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-xs font-bold dark:bg-primary-800 dark:text-primary-400">{(friends || []).length}</span>
            </div>
            <div className="space-y-4">
              {(friends || []).map(friend => (
                <div 
                  key={friend.id} 
                  onClick={() => setSelectedFriend(friend)}
                  className="flex items-center justify-between p-2 hover:bg-primary-50 rounded-xl cursor-pointer transition-colors group dark:hover:bg-primary-800"
                >
                  <div className="flex items-center gap-3">
                    <img src={friend.profile_pic || 'https://picsum.photos/seed/user/40'} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <span className="text-sm font-medium text-primary-800 group-hover:text-primary-600 dark:text-primary-100 dark:group-hover:text-primary-300">{friend.name || friend.username}</span>
                  </div>
                  <MessageCircle className="w-4 h-4 text-primary-300 group-hover:text-primary-600 dark:text-primary-600 dark:group-hover:text-primary-400" />
                </div>
              ))}
              {(!friends || friends.length === 0) && <p className="text-primary-500 italic text-center py-4 dark:text-primary-400">No friends yet</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Crop Modal */}
      <AnimatePresence>
        {imageToCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-stone-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Crop Profile Picture</h3>
                <Button variant="ghost" size="sm" onClick={() => setImageToCrop(null)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="relative h-[400px] bg-black">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <ZoomOut className="w-5 h-5 text-stone-500" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <ZoomIn className="w-5 h-5 text-stone-500" />
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-14 rounded-2xl border-white/10 text-white hover:bg-white/5"
                    onClick={() => setImageToCrop(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 h-14 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold"
                    onClick={handleUploadCroppedImage}
                    disabled={uploading}
                  >
                    {uploading ? 'Saving...' : 'Set Profile Picture'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Info Popup */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden dark:bg-primary-900"
            >
              <div className="bg-primary-900 h-24 relative dark:bg-primary-950">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFriend(null)}
                  className="absolute top-4 left-4 text-white hover:bg-primary-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFriend(null)}
                  className="absolute top-4 right-4 text-white hover:bg-primary-800"
                >
                  <X />
                </Button>
              </div>
              <div className="px-8 pb-8 -mt-12 text-center">
                <img 
                  src={selectedFriend.profile_pic || 'https://picsum.photos/seed/user/100'} 
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-lg mx-auto mb-4 dark:border-primary-800"
                  referrerPolicy="no-referrer"
                />
                <h3 className="text-2xl font-bold text-primary-900 dark:text-primary-50">{selectedFriend.name || selectedFriend.username}</h3>
                <p className="text-primary-700 text-sm mb-6 dark:text-primary-400">@{selectedFriend.username}</p>
                
                <div className="flex gap-4">
                  <Button 
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={() => navigate('/messages', { state: { selectedUser: selectedFriend } })}
                  >
                    <MessageCircle className="w-4 h-4" /> DM
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedFriend(null)}>Close</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden dark:bg-primary-900"
            >
              <div className="p-6 border-b border-primary-100 dark:border-primary-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="p-2 -ml-2">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h3 className="text-xl font-bold text-primary-900 dark:text-primary-50 flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Settings
                  </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Theme Color */}
                <div>
                  <label className="block text-sm font-bold text-primary-900 dark:text-primary-100 mb-4 uppercase tracking-wider">
                    Theme Color
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {themeColors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setThemeColor(color.value)}
                        className={`flex items-center justify-center gap-2 p-2 rounded-xl border-2 transition-all ${
                          themeColor === color.value 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-800' 
                            : 'border-transparent bg-stone-50 dark:bg-primary-950 hover:bg-stone-100 dark:hover:bg-primary-800'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: color.hex }} />
                        <span className="text-xs font-medium dark:text-primary-100">{color.name}</span>
                        {themeColor === color.value && <Check className="w-3 h-3 text-primary-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit Profile Details */}
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => navigate('/profile/setup')}
                  >
                    <User className="w-4 h-4" /> Edit Profile Details
                  </Button>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-primary-100 dark:border-primary-800">
                  <p className="text-sm font-bold text-red-600 mb-4 uppercase tracking-wider">Danger Zone</p>
                  <Button 
                    variant="outline" 
                    onClick={handleDeleteAccount}
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
