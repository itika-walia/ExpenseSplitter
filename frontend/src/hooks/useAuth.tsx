'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, TOKEN_KEY } from '@/lib/api';
import type { AuthResponse, User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been checked on first load. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const handleAuth = useCallback((response: AuthResponse) => {
    window.localStorage.setItem(TOKEN_KEY, response.token);
    setUser(response.user);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!window.localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return () => setUnauthorizedHandler(null);
    }
    api
      .me()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      logout,
      login: async (email, password) => handleAuth(await api.login({ email, password })),
      register: async (name, email, password) => handleAuth(await api.register({ name, email, password })),
    }),
    [user, loading, logout, handleAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
