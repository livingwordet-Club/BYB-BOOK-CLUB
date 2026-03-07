import { useState, useEffect } from 'react';

export function useTheme() {
  const [themeColor, setThemeColor] = useState<string>(() => {
    return localStorage.getItem('themeColor') || 'emerald';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light') return false;
    if (stored === 'dark') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('themeColor', themeColor);
    // You could apply this to a CSS variable if needed
    document.documentElement.style.setProperty('--primary-color', themeColor);
  }, [themeColor]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  return { themeColor, setThemeColor, isDarkMode, toggleDarkMode };
}
