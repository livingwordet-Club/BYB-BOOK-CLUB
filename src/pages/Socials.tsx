import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/UI';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Image as ImageIcon, 
  Book, 
  Send, 
  MoreHorizontal,
  User,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Post {
  id: number;
  user_id: number;
  username: string;
  name: string;
  profile_pic: string;
  content: string;
  image_url: string;
  type: 'text' | 'image' | 'verse';
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  created_at: string;
}

export default function Socials() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'text' | 'image' | 'verse'>('text');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/posts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [token]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && !imageUrl) return;
    setSubmitting(true);
    try {
      await axios.post('/api/posts', {
        content: newPost,
        image_url: imageUrl,
        type: postType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewPost('');
      setImageUrl('');
      setPostType('text');
      fetchPosts();
    } catch (err) {
      console.error('Failed to create post', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const response = await axios.post(`/api/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: response.data.liked,
            likes_count: response.data.liked ? parseInt(p.likes_count as any) + 1 : parseInt(p.likes_count as any) - 1
          };
        }
        return p;
      }));
    } catch (err) {
      console.error('Like failed', err);
    }
  };

  if (loading) return <div className="p-8 text-center text-primary-600">Loading Feed...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-8">
      {/* Create Post */}
      <Card className="p-4 space-y-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold dark:bg-primary-800">
            {user?.profile_pic ? (
              <img src={user.profile_pic} alt={user.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.username[0]
            )}
          </div>
          <textarea
            placeholder="Share a thought, a verse, or an idea..."
            className="flex-1 bg-transparent border-none outline-none resize-none text-primary-900 dark:text-primary-50 placeholder-primary-400"
            rows={3}
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
        </div>

        {postType === 'image' && (
          <Input 
            placeholder="Image URL (e.g. https://...)" 
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="text-sm"
          />
        )}

        <div className="flex items-center justify-between pt-4 border-t border-primary-50 dark:border-primary-800">
          <div className="flex gap-2">
            <button 
              onClick={() => setPostType('text')}
              className={`p-2 rounded-lg transition-colors ${postType === 'text' ? 'bg-primary-100 text-primary-600 dark:bg-primary-800' : 'text-primary-400 hover:bg-primary-50'}`}
            >
              <Quote size={20} />
            </button>
            <button 
              onClick={() => setPostType('image')}
              className={`p-2 rounded-lg transition-colors ${postType === 'image' ? 'bg-primary-100 text-primary-600 dark:bg-primary-800' : 'text-primary-400 hover:bg-primary-50'}`}
            >
              <ImageIcon size={20} />
            </button>
            <button 
              onClick={() => setPostType('verse')}
              className={`p-2 rounded-lg transition-colors ${postType === 'verse' ? 'bg-primary-100 text-primary-600 dark:bg-primary-800' : 'text-primary-400 hover:bg-primary-50'}`}
            >
              <Book size={20} />
            </button>
          </div>
          <Button onClick={handleCreatePost} disabled={submitting} className="px-6">
            {submitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </Card>

      {/* Feed */}
      <div className="space-y-6">
        <AnimatePresence>
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="p-0 overflow-hidden">
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold dark:bg-primary-800">
                      {post.profile_pic ? (
                        <img src={post.profile_pic} alt={post.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        post.username[0]
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-primary-900 dark:text-primary-50">{post.name || post.username}</h4>
                      <p className="text-[10px] text-primary-400">
                        {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <button className="text-primary-400 hover:text-primary-600">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-4">
                  {post.type === 'verse' ? (
                    <div className="bg-primary-50 p-6 rounded-2xl border-l-4 border-primary-600 italic dark:bg-primary-900/50">
                      <Quote className="text-primary-200 mb-2" size={32} />
                      <p className="text-lg font-serif text-primary-900 dark:text-primary-50">"{post.content}"</p>
                    </div>
                  ) : (
                    <p className="text-primary-900 dark:text-primary-50 whitespace-pre-wrap">{post.content}</p>
                  )}
                </div>

                {post.image_url && (
                  <div className="aspect-video bg-primary-100 dark:bg-primary-800">
                    <img 
                      src={post.image_url} 
                      alt="Post content" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Post Actions */}
                <div className="p-4 flex items-center gap-6 border-t border-primary-50 dark:border-primary-800">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors ${post.is_liked ? 'text-red-500' : 'text-primary-400 hover:text-red-500'}`}
                  >
                    <Heart size={20} fill={post.is_liked ? 'currentColor' : 'none'} />
                    <span className="text-sm font-bold">{post.likes_count}</span>
                  </button>
                  <button className="flex items-center gap-2 text-primary-400 hover:text-primary-600 transition-colors">
                    <MessageCircle size={20} />
                    <span className="text-sm font-bold">{post.comments_count}</span>
                  </button>
                  <button className="flex items-center gap-2 text-primary-400 hover:text-primary-600 transition-colors">
                    <Share2 size={20} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
