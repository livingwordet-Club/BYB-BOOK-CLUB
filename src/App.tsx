import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './pages/ProfileSetup';
import BibleReader from './pages/BibleReader';
import BookLibrary from './pages/BookLibrary';
import AudioBookLibrary from './pages/AudioBookLibrary';
import ProfilePage from './pages/ProfilePage';
import AdminPanel from './pages/AdminPanel';
import MessagesPage from './pages/MessagesPage';
import Footer from './components/Footer';
import { motion } from 'motion/react';
import { BookOpen, Home, Book as BookIcon, User, Shield, LogOut, Menu, X, Headphones } from 'lucide-react';

function Navbar() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (!user) return null;

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/bible', label: 'Bible', icon: BookOpen },
    { to: '/books', label: 'Library', icon: BookIcon },
    { to: '/audiobooks', label: 'Audio', icon: Headphones },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  if (user.isAdmin) {
    links.push({ to: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <nav className="bg-[#283644] border-b border-white/10 sticky top-0 z-40 dark:bg-primary-950/80 dark:border-primary-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="bg-primary-600 p-1.5 rounded-lg dark:bg-primary-800">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">BYB MKC</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === link.to 
                    ? 'bg-white/20 text-white' 
                    : 'text-stone-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white p-2"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-[#283644] border-b border-white/10 p-4 space-y-2 dark:bg-primary-950/90 dark:border-primary-900"
        >
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                location.pathname === link.to 
                  ? 'bg-white/20 text-white' 
                  : 'text-stone-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-400 hover:bg-red-500/10 w-full text-left"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </motion.div>
      )}
    </nav>
  );
}

// Line 112
// Line 112
function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  
  // Line 115: IMPORTANT - You must wait for loading to finish
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#050505] text-white">Loading...</div>;
  }

  // Line 119: Only redirect once isLoading is FALSE and user is still NULL
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { isDarkMode } = useTheme();

  return (
    <Router>
      <div className={`min-h-screen flex flex-col transition-colors duration-300 relative overflow-hidden ${isDarkMode ? 'dark bg-[#050505]' : 'bg-[#F7F6E5]'}`}>
        {isDarkMode && (
          <div className="lens-background">
            <div className="lens-glow" />
            <div className="lens-grid" />
            <div className="lens-scan-line" />
          </div>
        )}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/setup-profile" element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />
              <Route path="/bible" element={<PrivateRoute><BibleReader /></PrivateRoute>} />
              <Route path="/books" element={<PrivateRoute><BookLibrary /></PrivateRoute>} />
              <Route path="/audiobooks" element={<PrivateRoute><AudioBookLibrary /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/messages" element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute adminOnly><AdminPanel /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>
    </Router>
  );
}
