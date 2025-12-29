import { kv } from '@/lib/kv';

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'operator';
  password: string;
  yearBorn?: string;
  class?: string;
  schoolForm?: string;
  registeredAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
};

export const DEFAULT_USERS: StoredUser[] = [
  { id: '1', email: 'admin@schulplaner.de', name: 'Admin User', role: 'admin', password: 'admin123' },
  { id: '2', email: 'student@schulplaner.de', name: 'Student User', role: 'user', password: 'student123' },
];

const USERS_KEY = 'schulplaner:users';

export async function getStoredUsers(): Promise<StoredUser[]> {
  if (!kv.isConfigured()) {
    return DEFAULT_USERS;
  }

  try {
    const users = await kv.get<StoredUser[]>(USERS_KEY);
    if (users && Array.isArray(users) && users.length > 0) {
      return users;
    }
    await kv.set(USERS_KEY, DEFAULT_USERS);
    return DEFAULT_USERS;
  } catch (error) {
    console.error('[users-server] getStoredUsers fallback to defaults:', error);
    return DEFAULT_USERS;
  }
}

export async function saveStoredUsers(users: StoredUser[]): Promise<void> {
  if (!kv.isConfigured()) {
    return;
  }

  try {
    await kv.set(USERS_KEY, users);
  } catch (error) {
    console.error('[users-server] saveStoredUsers error:', error);
  }
}


