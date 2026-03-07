import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import Messages from './pages/Messages';
import BibleReader from './pages/BibleReader';
import Socials from './pages/Socials';
import Reader from './pages/Reader';
import Footer from './components/Footer';
import { BookOpen, User, MessageSquare, LayoutDashboard, LogOut, Menu, X, Shield, Book, Share2 } from 'lucide-react';
import { Button } from './components/UI';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return token ? <>{children}</> : <Navigate to="/auth" />;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-950 flex flex-col">
      <nav className="bg-white border-b border-primary-100 dark:bg-primary-900 dark:border-primary-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-xl">
                <BookOpen size={28} />
                <span className="hidden sm:inline">BYB MKC</span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
              <NavLink to="/bible" icon={<Book size={18} />} label="Bible" />
              <NavLink to="/socials" icon={<Share2 size={18} />} label="Socials" />
              <NavLink to="/library" icon={<BookOpen size={18} />} label="Library" />
              <NavLink to="/messages" icon={<MessageSquare size={18} />} label="Messages" />
              <NavLink to="/profile" icon={<User size={18} />} label="Profile" />
              {user?.isAdmin && (
                <NavLink to="/admin" icon={<Shield size={18} />} label="Admin" />
              )}
              <Button variant="ghost" size="sm" onClick={logout} className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut size={18} /> Logout
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-primary-600 dark:text-primary-400">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-primary-100 dark:bg-primary-900 dark:border-primary-800 p-4 space-y-2">
            <MobileNavLink to="/" label="Dashboard" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/bible" label="Bible" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/socials" label="Socials" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/library" label="Library" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/messages" label="Messages" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/profile" label="Profile" onClick={() => setIsMenuOpen(false)} />
            {user?.isAdmin && (
              <MobileNavLink to="/admin" label="Admin" onClick={() => setIsMenuOpen(false)} />
            )}
            <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-red-600">
              Logout
            </Button>
          </div>
        )}
      </nav>

      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-primary-600 hover:text-primary-900 font-medium transition-colors dark:text-primary-400 dark:hover:text-primary-100">
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({ to, label, onClick }: { to: string; label: string; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="block px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg dark:text-primary-400 dark:hover:bg-primary-800">
      {label}
    </Link>
  );
}

// Placeholder pages
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/library" element={
            <PrivateRoute>
              <Layout>
                <Library />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/bible" element={
            <PrivateRoute>
              <Layout>
                <BibleReader />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/socials" element={
            <PrivateRoute>
              <Layout>
                <Socials />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/reader" element={
            <PrivateRoute>
              <Reader />
            </PrivateRoute>
          } />
          <Route path="/messages" element={
            <PrivateRoute>
              <Layout>
                <Messages />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute>
              <Layout>
                <AdminPanel />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
