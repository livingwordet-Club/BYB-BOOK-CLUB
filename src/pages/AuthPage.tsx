import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Card } from '../components/UI';
import { BookOpen, LogIn, UserPlus, Key } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isReset ? '/api/auth/reset-password' : (isLogin ? '/api/auth/login' : '/api/auth/register');
    const body = isReset 
        ? { username, newPassword: password } 
        : (isLogin ? { username, password } : { username, password, email });

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || 'Server error');
      }

      if (res.ok) {
        if (isLogin && !isReset) {
          login(data.token, data.user);
          navigate('/dashboard');
        } else {
          setIsLogin(true);
          setIsReset(false);
          alert(isReset ? 'Password reset successful!' : 'Registration successful! Please login.');
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-block p-4 bg-primary-600 rounded-3xl shadow-xl mb-4 dark:bg-primary-800">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary-900 dark:text-primary-50">BYB MKC</h1>
          <p className="text-primary-600 italic dark:text-primary-400">Spiritual Book Library</p>
        </motion.div>

        <Card className="relative overflow-hidden dark:bg-primary-900 dark:border-primary-800">
          <AnimatePresence mode="wait">
            <motion.div
              key={isReset ? 'reset' : (isLogin ? 'login' : 'signup')}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-primary-800 mb-6 dark:text-primary-100">
                {isReset ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Join the Library')}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1 dark:text-primary-300">Username</label>
                  <Input 
                    required 
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
                  />
                </div>
                
                {!isLogin && !isReset && (
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1 dark:text-primary-300">Email</label>
                    <Input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1 dark:text-primary-300">
                    {isReset ? 'New Password' : 'Password'}
                  </label>
                  <Input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="dark:bg-primary-950 dark:border-primary-800 dark:text-primary-50"
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <Button type="submit" className="w-full">
                  {isReset ? 'Update Password' : (isLogin ? 'Sign In' : 'Create Account')}
                </Button>
              </form>

              <div className="mt-6 space-y-2 text-center">
                {!isReset && (
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-primary-600 hover:underline block w-full dark:text-primary-400"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsReset(!isReset);
                    setIsLogin(true);
                  }}
                  className="text-sm text-primary-600 hover:underline block w-full dark:text-primary-400"
                >
                  {isReset ? "Back to Login" : "Forgot Password?"}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
