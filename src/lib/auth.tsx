'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

type User = {
  _id: string;
  email: string;
  name?: string;
  createdAt?: string;
};

type AuthResult = { success: boolean; error?: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name?: string) => Promise<AuthResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'apr_finder_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (savedToken) {
      setToken(savedToken);
      void fetchUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await api.get<{ data: { user: User }; success?: boolean; error?: string }>('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const ok = (response.data as unknown as Record<string, unknown>)?.success ?? true;
      if (ok && response.data?.data?.user) {
        setUser(response.data.data.user);
        setToken(authToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await api.post<{ success: boolean; data?: { user: User; token: string }; error?: string }>(
        '/api/auth/login',
        { email, password },
      );
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        setUser(user);
        setToken(token);
        localStorage.setItem(TOKEN_KEY, token);
        return { success: true };
      }
      return { success: false, error: response.data.error || 'Login failed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<AuthResult> => {
    try {
      const response = await api.post<{ success: boolean; data?: { user: User; token: string }; error?: string }>(
        '/api/auth/register',
        { email, password, name },
      );
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        setUser(user);
        setToken(token);
        localStorage.setItem(TOKEN_KEY, token);
        return { success: true };
      }
      return { success: false, error: response.data.error || 'Registration failed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  return <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

