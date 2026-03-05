import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, we just simulate a success state
    setSubmitted(true);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-[#121212] p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-white/10"
      >
        {!submitted ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-4 rounded-full">
                <KeyRound className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-stone-900 dark:text-white mb-2">
              Forgot Password?
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-center mb-8">
              Enter your email and we'll send you instructions to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary-500/20"
              >
                Send Reset Link
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">Check your email</h2>
            <p className="text-stone-600 dark:text-stone-400 mb-8">
              We've sent a password reset link to <br />
              <span className="font-semibold text-stone-900 dark:text-white">{email}</span>
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-stone-100 dark:border-white/5">
          <Link 
            to="/" 
            className="flex items-center justify-center gap-2 text-stone-600 dark:text-stone-400 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
