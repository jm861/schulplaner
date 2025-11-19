import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'operator';
  password: string;
  yearBorn?: string;
  class?: string;
  schoolForm?: string;
  registeredAt?: string;
};

// Default users
const DEFAULT_USERS: User[] = [
  { id: '1', email: 'admin@schulplaner.de', name: 'Admin User', role: 'admin', password: 'admin123' },
  { id: '2', email: 'student@schulplaner.de', name: 'Student User', role: 'user', password: 'student123' },
];

const USERS_KEY = 'schulplaner:users';

// Get users from KV store
async function getUsers(): Promise<User[]> {
  try {
    // Check if KV is configured
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.warn('[getUsers] Vercel KV not configured, using defaults. Set KV_REST_API_URL and KV_REST_API_TOKEN in Vercel.');
      return DEFAULT_USERS;
    }

    const users = await kv.get<User[]>(USERS_KEY);
    if (users && Array.isArray(users) && users.length > 0) {
      return users;
    }
    // Initialize with defaults if empty
    await kv.set(USERS_KEY, DEFAULT_USERS);
    return DEFAULT_USERS;
  } catch (error) {
    console.error('[getUsers] KV error, using defaults:', error);
    // If KV is not configured or fails, return defaults
    return DEFAULT_USERS;
  }
}

// Save users to KV store
async function saveUsers(users: User[]): Promise<void> {
  try {
    // Check if KV is configured
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.warn('[saveUsers] Vercel KV not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN in Vercel.');
      return;
    }

    await kv.set(USERS_KEY, users);
  } catch (error) {
    console.error('[saveUsers] KV error:', error);
    // Silently fail - localStorage will still work as fallback
  }
}

// GET /api/users - Get all users (admin/operator only)
export async function GET(req: NextRequest) {
  try {
    const users = await getUsers();
    
    // In a real app, verify admin/operator role from session/token
    // For now, we'll allow access (you should add authentication middleware)
    const authHeader = req.headers.get('authorization');
    
    // Return all users (admins need passwords for management)
    // In production, check if user is admin before returning passwords
    return NextResponse.json({ users });
  } catch (error) {
    console.error('[users GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create or update user
export async function POST(req: NextRequest) {
  try {
    const users = await getUsers();
    const body = await req.json() as { action: 'create' | 'update' | 'delete'; user?: User; userId?: string };
    const { action, user, userId } = body;

    if (action === 'create' && user) {
      // Check if user already exists (by ID or email)
      const existingById = users.find((u) => u.id === user.id);
      const existingByEmail = users.find((u) => u.email === user.email);
      
      if (existingById) {
        // User exists by ID, update instead
        const index = users.findIndex((u) => u.id === user.id);
        const updatedUsers = [...users];
        updatedUsers[index] = user;
        await saveUsers(updatedUsers);
        return NextResponse.json({ success: true, user, action: 'updated' });
      }
      
      if (existingByEmail) {
        // Email exists but different ID - this shouldn't happen, but handle it
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }

      // New user - add it
      const updatedUsers = [...users, user];
      await saveUsers(updatedUsers);
      return NextResponse.json({ success: true, user });
    }

    if (action === 'update' && user) {
      const index = users.findIndex((u) => u.id === user.id);
      if (index === -1) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const updatedUsers = [...users];
      updatedUsers[index] = user;
      await saveUsers(updatedUsers);
      return NextResponse.json({ success: true, user });
    }

    if (action === 'delete' && userId) {
      const updatedUsers = users.filter((u) => u.id !== userId);
      await saveUsers(updatedUsers);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[users POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

