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

    // Check for saved session - restore user immediately
    try {
      const savedAuth = readJSON<{ user: User } | null>(AUTH_STORAGE_KEY, null);
      
      if (savedAuth?.user) {
        // Verify user still exists in users list
        const allUsers = readJSON<Array<User & { password: string }>>(USERS_STORAGE_KEY, mergedUsers);
        const userStillExists = allUsers.some(u => u.id === savedAuth.user.id && u.email === savedAuth.user.email);
        
        if (userStillExists) {
          setUser(savedAuth.user);
        } else {
          // User no longer exists, clear auth
          writeJSON(AUTH_STORAGE_KEY, null);
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      // Clear corrupted auth data
      try {
        writeJSON(AUTH_STORAGE_KEY, null);
      } catch {
        // Ignore
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Normalize email for comparison (lowercase, trim)
      const normalizedEmail = email.toLowerCase().trim();
      const trimmedPassword = password.trim();
      
      if (!normalizedEmail || !trimmedPassword) {
        console.error('[auth] Empty email or password');
        return false;
      }
      
      console.log('[auth] Attempting login:', { normalizedEmail, passwordLength: trimmedPassword.length });
      
      // Read users - try multiple times on mobile if needed (up to 5 attempts with longer delays)
      let users = readJSON<Array<User & { password: string }>>(USERS_STORAGE_KEY, DEFAULT_USERS);
      let attempts = 0;
      const maxAttempts = 5;
      
      console.log('[auth] Initial users read:', { 
        userCount: users.length, 
        emails: users.map(u => u.email.toLowerCase().trim()),
        hasLocalStorage: typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      });
      
      // Mobile localStorage might not be ready immediately - try multiple times
      while (attempts < maxAttempts) {
        // Check if we need to retry (new user not found in localStorage yet)
        const isNewUser = normalizedEmail !== 'admin@schulplaner.de' && 
                          normalizedEmail !== 'student@schulplaner.de' &&
                          !users.some(u => u.email.toLowerCase().trim() === normalizedEmail);
        
        if (isNewUser && attempts < maxAttempts - 1) {
          // Wait longer on mobile (up to 1 second total)
          const delay = 200 * (attempts + 1);
          console.log(`[auth] New user not found, retrying in ${delay}ms (attempt ${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          users = readJSON<Array<User & { password: string }>>(USERS_STORAGE_KEY, DEFAULT_USERS);
          console.log(`[auth] Retry ${attempts + 1} - users found:`, {
            userCount: users.length,
            emails: users.map(u => u.email.toLowerCase().trim())
          });
          attempts++;
          continue;
        }
        break;
      }
      
      // Case-insensitive email matching for mobile compatibility
      // Also try exact match in case email wasn't normalized during registration
      const foundUser = users.find((u) => {
        const userEmail = u.email.toLowerCase().trim();
        const emailMatch = userEmail === normalizedEmail;
        const passwordMatch = u.password === trimmedPassword;
        
        // Log for debugging
        if (emailMatch && !passwordMatch) {
          console.warn('[auth] Email matches but password does not:', {
            userEmail,
            inputPassword: trimmedPassword,
            storedPassword: u.password,
            passwordLengths: { input: trimmedPassword.length, stored: u.password.length }
          });
        }
        
        return emailMatch && passwordMatch;
      });

      if (!foundUser) {
        // More detailed error logging
        const matchingEmail = users.find(u => u.email.toLowerCase().trim() === normalizedEmail);
        console.error('[auth] User not found or password incorrect', {
          normalizedEmail,
          userCount: users.length,
          userEmails: users.map(u => u.email.toLowerCase().trim()),
          hasMatchingEmail: !!matchingEmail,
          matchingEmailPassword: matchingEmail ? matchingEmail.password : null,
          inputPassword: trimmedPassword,
          passwordMatch: matchingEmail ? matchingEmail.password === trimmedPassword : false
        });
        return false;
      }
      
      console.log('[auth] User found, proceeding with login:', foundUser.email);

      const { password: _, ...userWithoutPassword } = foundUser;
      
      // Update last login time locally
      const now = new Date().toISOString();
      const updatedUser = {
        ...userWithoutPassword,
        lastLoginAt: now,
        loginCount: (userWithoutPassword.loginCount || 0) + 1,
      };
      
      // Update in localStorage with retry logic for mobile
      const updatedUsers = users.map((u) =>
        u.id === foundUser.id
          ? { ...u, lastLoginAt: now, loginCount: (u.loginCount || 0) + 1 }
          : u
      );
      
      // Write with retry on mobile
      let writeSuccess = writeJSON(USERS_STORAGE_KEY, updatedUsers);
      if (!writeSuccess) {
        // Retry once
        await new Promise(resolve => setTimeout(resolve, 100));
        writeSuccess = writeJSON(USERS_STORAGE_KEY, updatedUsers);
      }
      
      // Set user state immediately (before localStorage write completes on mobile)
      setUser(updatedUser);
      
      // Write auth token with retry
      let authWriteSuccess = writeJSON(AUTH_STORAGE_KEY, { user: updatedUser });
      if (!authWriteSuccess) {
        // Retry once
        await new Promise(resolve => setTimeout(resolve, 100));
        authWriteSuccess = writeJSON(AUTH_STORAGE_KEY, { user: updatedUser });
      }
      
      if (!writeSuccess || !authWriteSuccess) {
        console.warn('[auth] localStorage write may have failed, but user is logged in');
      }
      
      // Track login server-side (if KV is configured) - don't block on this
      fetch('/api/track-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: foundUser.id, email: foundUser.email }),
      }).catch(error => {
        // Silently fail - localStorage already updated
        console.warn('[auth] Failed to track login server-side:', error);
      });
      
      return true;
    } catch (error) {
      console.error('[auth] Login error:', error);
      return false;
    }
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

