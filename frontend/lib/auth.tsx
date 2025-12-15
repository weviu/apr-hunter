'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User {
  _id: string;
  email: string;
  name?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'apr_finder_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch user with token
  const fetchUser = async (authToken: string) => {
    try {
      const response = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.data.success) {
        setUser(response.data.data.user);
        setToken(authToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data.success) {
        const { user, token } = response.data.data;
        setUser(user);
        setToken(token);
        localStorage.setItem(TOKEN_KEY, token);
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  // Register
  const register = async (email: string, password: string, name?: string) => {
    try {
      const response = await api.post('/api/auth/register', { email, password, name });
      if (response.data.success) {
        const { user, token } = response.data.data;
        setUser(user);
        setToken(token);
        localStorage.setItem(TOKEN_KEY, token);
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      return { success: false, error: message };
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}



