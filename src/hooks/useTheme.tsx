import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeColor = 'emerald' | 'blue' | 'brown' | 'orange' | 'yellow' | 'red' | 'pink' | 'purple' | 'gray';

interface ThemeContextType {
  themeColor: ThemeColor;
  isDarkMode: boolean;
  setThemeColor: (color: ThemeColor) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem('themeColor') as ThemeColor) || 'emerald';
  });
  const [isDarkMode] = useState(true);

  useEffect(() => {
    localStorage.setItem('themeColor', themeColor);
    document.documentElement.setAttribute('data-theme', themeColor);
  }, [themeColor]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const setThemeColor = (color: ThemeColor) => setThemeColorState(color);
  const toggleDarkMode = () => {};

  return (
    <ThemeContext.Provider value={{ themeColor, isDarkMode, setThemeColor, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
