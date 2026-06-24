"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type User = {
  telegram_id: string;
  username: string;
  full_name: string;
  is_admin: boolean;
  is_approved: boolean;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (telegramId: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (telegramId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('telegram_id, username, nama_lengkap, status')
        .eq('telegram_id', telegramId)
        .single();

      if (!error && data) {
        // Map DB columns to our User type
        setUser({
          telegram_id: data.telegram_id,
          username: data.username || '',
          full_name: data.nama_lengkap,
          is_admin: data.status === 'ADMIN',
          is_approved: true, // If user exists in DB, they're approved
        });
        return true;
      } else {
        console.error('User not found or error:', error);
        setUser(null);
        return false;
      }
    } catch (err) {
      console.error('fetchUser error:', err);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedId = localStorage.getItem('telegram_id');
    if (storedId) {
      fetchUser(storedId);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (telegramId: string): Promise<boolean> => {
    setLoading(true);
    const success = await fetchUser(telegramId);
    if (success) {
      localStorage.setItem('telegram_id', telegramId);
    } else {
      localStorage.removeItem('telegram_id');
    }
    return success;
  };

  const logout = () => {
    localStorage.removeItem('telegram_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
