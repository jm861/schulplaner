import { NextRequest, NextResponse } from 'next/server';
import { upstash } from '@/lib/upstash';

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
  lastLoginAt?: string;
  loginCount?: number;
};

const USERS_KEY = 'schulplaner:users';

// POST /api/track-login - Track user login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { userId: string; email: string };
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Get users from Upstash or return (if not configured, client-side will handle it)
    if (!upstash.isConfigured()) {
      // Upstash not configured - return success but don't track (localStorage will handle it)
      return NextResponse.json({ success: true, message: 'Upstash not configured, using localStorage' });
    }

    try {
      let users = await upstash.get<User[]>(USERS_KEY);
      
      // Initialize empty array if KV is empty
      if (!users || !Array.isArray(users)) {
        users = [];
      }
      
      const userIndex = users.findIndex((u) => u.id === userId || u.email === email);
      const now = new Date().toISOString();
      
      if (userIndex >= 0) {
        // User exists - update login info
        users[userIndex] = {
          ...users[userIndex],
          lastLoginAt: now,
          loginCount: (users[userIndex].loginCount || 0) + 1,
        };
      } else {
        // User not in KV yet - try to get from request body or create minimal entry
        // This can happen if user was created in localStorage but not synced to KV
        const newUser: User = {
          id: userId,
          email: email,
          name: email.split('@')[0], // Fallback name
          role: 'user',
          password: '', // Password not available here
          lastLoginAt: now,
          loginCount: 1,
        };
        users.push(newUser);
      }
      
      await upstash.set(USERS_KEY, users);
      
      const updatedUser = users.find((u) => u.id === userId || u.email === email);
      
      return NextResponse.json({ 
        success: true, 
        lastLoginAt: updatedUser?.lastLoginAt || now,
        loginCount: updatedUser?.loginCount || 1,
        synced: true
      });
    } catch (upstashError) {
      console.error('[track-login] Upstash error:', upstashError);
      // Return success anyway - localStorage will handle it
      return NextResponse.json({ 
        success: true, 
        message: 'Upstash error, using localStorage',
        synced: false
      });
    }
  } catch (error) {
    console.error('[track-login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to track login' },
      { status: 500 }
    );
  }
}

