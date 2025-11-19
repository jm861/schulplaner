import { NextRequest, NextResponse } from 'next/server';

// Optional KV import - only use if configured
// Supports both Vercel KV and Upstash Redis variable names
let kv: any = null;
try {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (kvUrl && kvToken) {
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
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!kv || !kvUrl || !kvToken) {
      // KV not configured - return success but don't track (localStorage will handle it)
      return NextResponse.json({ success: true, message: 'KV not configured, using localStorage' });
    }

    try {
      let users = await (kv as any).get(USERS_KEY) as User[] | null;
      
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
      
      await (kv as any).set(USERS_KEY, users);
      
      const updatedUser = users.find((u) => u.id === userId || u.email === email);
      
      return NextResponse.json({ 
        success: true, 
        lastLoginAt: updatedUser?.lastLoginAt || now,
        loginCount: updatedUser?.loginCount || 1,
        synced: true
      });
    } catch (kvError) {
      console.error('[track-login] KV error:', kvError);
      // Return success anyway - localStorage will handle it
      return NextResponse.json({ 
        success: true, 
        message: 'KV error, using localStorage',
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

