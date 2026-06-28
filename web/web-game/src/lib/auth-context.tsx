import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import * as authApi from './authApi';

export interface User {
  id: number; username: string; email: string;
  vip: boolean; level: number; gold: number; xp: number;
  role?: string;
  totalDistance?: number; totalTrips?: number; checkins?: number;
  rank?: string; vehicle?: string;
}

interface AuthContextType {
  user: User | null; isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string>;
  register: (username: string, email: string, password: string) => Promise<string>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, isAuthenticated: false,
  login: async () => '', register: async () => '', logout: () => {}, updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gridrunner_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setReady(true);
  }, []);

  const login = async (email: string, password: string): Promise<string> => {
    const data = await authApi.login(email, password);
    const u: User = { id: data.user.id, username: data.user.username, email: data.user.email, vip: false, level: 1, gold: 0, xp: 0 };
    localStorage.setItem('gridrunner_user', JSON.stringify(u));
    localStorage.setItem('gridrunner_token', data.token);
    setUser(u);
    return data.token;
  };

  const register = async (username: string, email: string, password: string): Promise<string> => {
    const data = await authApi.register(username, email, password);
    const u: User = { id: data.user.id, username: data.user.username, email: data.user.email, vip: false, level: 1, gold: 0, xp: 0 };
    localStorage.setItem('gridrunner_user', JSON.stringify(u));
    localStorage.setItem('gridrunner_token', data.token);
    setUser(u);
    return data.token;
  };

  const logout = () => {
    localStorage.removeItem('gridrunner_user');
    localStorage.removeItem('gridrunner_token');
    setUser(null);
    router.push('/');
  };

  const updateUser = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    localStorage.setItem('gridrunner_user', JSON.stringify(updated));
    setUser(updated);
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1a0f' }}><div className="w-8 h-8 border-2 border-[#00e676] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
