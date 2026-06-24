import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type User = {
  id: string;
  telegram_id: string;
  full_name: string;
  is_admin?: boolean;
  is_approved?: boolean;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (telegramId: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (telegramId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, full_name, is_admin, is_approved')
      .eq('telegram_id', telegramId)
      .single();
    if (!error && data) {
      setUser(data as User);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const storedId = localStorage.getItem('telegram_id');
    if (storedId) {
      fetchUser(storedId);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (telegramId: string) => {
    localStorage.setItem('telegram_id', telegramId);
    await fetchUser(telegramId);
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
