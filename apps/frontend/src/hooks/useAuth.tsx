'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { UserSummary, SignupInput, LoginInput } from '@/shared';
import { api } from '@/lib/api';

interface AuthContextType {
  user: UserSummary | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await api.getMe();
      if (res.data) {
        setUser(res.data);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(input: LoginInput) {
    const res = await api.login(input);
    if (res.data?.user) {
      setUser(res.data.user);
      if (res.data.user.role === 'brand') {
        router.push('/dashboard/brand');
      } else {
        router.push('/dashboard/creator');
      }
    }
  }

  async function signup(input: SignupInput) {
    const res = await api.signup(input);
    if (res.data?.user) {
      setUser(res.data.user);
      if (res.data.user.role === 'brand') {
        router.push('/dashboard/brand');
      } else {
        router.push('/dashboard/creator');
      }
    }
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
      router.push('/login');
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
