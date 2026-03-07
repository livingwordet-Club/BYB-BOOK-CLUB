import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// --- Lines 22 to 38 ---

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Line 24: Initialize token immediately using a function to avoid multi-render lag
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  // Line 27: Initialize user immediately from storage so PrivateRoute sees it on frame 1
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        return null;
      }
    }
    return null;
  });

  // Line 38: Set to false immediately as the check is now synchronous
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Line 41: Keep the sync effect but remove the setIsLoading call
    const storedUser = localStorage.getItem('user');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    }
  }, [token]);

// --- Remainder of file stays identical ---

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
