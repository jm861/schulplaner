import { NextRequest, NextResponse } from 'next/server';

// Optional KV import - only use if configured
let kv: any = null;
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kv = require('@vercel/kv').kv;
  }
} catch (error) {
  // KV not available, will use fallback
}

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

    // Get users from KV or return (if not configured, client-side will handle it)
    if (!kv || !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      // KV not configured - return success but don't track (localStorage will handle it)
      return NextResponse.json({ success: true, message: 'KV not configured, using localStorage' });
    }

    try {
      const users = await (kv as any).get(USERS_KEY) as User[] | null;
      
      if (users && Array.isArray(users)) {
        const userIndex = users.findIndex((u) => u.id === userId || u.email === email);
        
        if (userIndex >= 0) {
          const now = new Date().toISOString();
          users[userIndex] = {
            ...users[userIndex],
            lastLoginAt: now,
            loginCount: (users[userIndex].loginCount || 0) + 1,
          };
          
          await (kv as any).set(USERS_KEY, users);
          
          return NextResponse.json({ 
            success: true, 
            lastLoginAt: now,
            loginCount: users[userIndex].loginCount 
          });
        }
      }
    } catch (kvError) {
      console.error('[track-login] KV error:', kvError);
      // Return success anyway - localStorage will handle it
      return NextResponse.json({ success: true, message: 'KV error, using localStorage' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[track-login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to track login' },
      { status: 500 }
    );
  }
}

