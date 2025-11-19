'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { readJSON, writeJSON } from '@/lib/storage';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'operator';
  yearBorn?: string;
  class?: string;
  schoolForm?: string;
  registeredAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperator: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default users (in a real app, this would be in a database)
const DEFAULT_USERS: Array<User & { password: string }> = [
  { id: '1', email: 'admin@schulplaner.de', name: 'Admin User', role: 'admin', password: 'admin123' },
  { id: '2', email: 'student@schulplaner.de', name: 'Student User', role: 'user', password: 'student123' },
];

const AUTH_STORAGE_KEY = 'schulplaner:auth';
const USERS_STORAGE_KEY = 'schulplaner:users';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize users - ensure default users always exist
    const existingUsers = readJSON<Array<User & { password: string }>>(USERS_STORAGE_KEY, []);
    
    // Merge default users with existing users, ensuring defaults are always present
    const defaultUserEmails = DEFAULT_USERS.map(u => u.email);
    const usersToKeep = existingUsers.filter(u => !defaultUserEmails.includes(u.email));
    const mergedUsers = [...DEFAULT_USERS, ...usersToKeep];
    
    // Only write if we added default users or if there were no users
    if (existingUsers.length === 0 || usersToKeep.length !== existingUsers.length) {
      writeJSON(USERS_STORAGE_KEY, mergedUsers);
    }

    // Check for saved session
    const savedAuth = readJSON<{ user: User } | null>(AUTH_STORAGE_KEY, null);
    if (savedAuth?.user) {
      setUser(savedAuth.user);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const users = readJSON<Array<User & { password: string }>>(USERS_STORAGE_KEY, DEFAULT_USERS);
    const foundUser = users.find((u) => u.email === email && u.password === password);

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      
      // Update last login time locally
      const now = new Date().toISOString();
      const updatedUser = {
        ...userWithoutPassword,
        lastLoginAt: now,
        loginCount: (userWithoutPassword.loginCount || 0) + 1,
      };
      
      // Update in localStorage
      const updatedUsers = users.map((u) =>
        u.id === foundUser.id
          ? { ...u, lastLoginAt: now, loginCount: (u.loginCount || 0) + 1 }
          : u
      );
      writeJSON(USERS_STORAGE_KEY, updatedUsers);
      
      setUser(updatedUser);
      writeJSON(AUTH_STORAGE_KEY, { user: updatedUser });
      
      // Track login server-side (if KV is configured)
      try {
        await fetch('/api/track-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: foundUser.id, email: foundUser.email }),
        });
      } catch (error) {
        // Silently fail - localStorage already updated
      }
      
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isOperator: user?.role === 'operator' || user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

