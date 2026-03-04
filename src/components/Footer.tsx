import React from 'react';
import { useTheme } from '../hooks/useTheme';

export default function Footer() {
  const { isDarkMode } = useTheme();
  
  return (
    <footer className={`py-8 px-6 border-t transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-[#050505] border-white/10 text-stone-400' 
        : 'bg-white border-stone-100 text-stone-500'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">BYB</div>
          <span className="font-bold text-stone-800 dark:text-white">BYB MKC Library</span>
        </div>
        
        <div className="text-sm text-center md:text-right">
          <p className="font-medium">Powered by Living word | ET 2026©</p>
          <p className="text-xs opacity-70 mt-1">Spiritual Wisdom for the Modern Soul</p>
        </div>
      </div>
    </footer>
  );
}
