import { NextRequest, NextResponse } from 'next/server';

import { markPasswordResetTokenUsed, validatePasswordResetToken } from '@/lib/password-reset';
import { getStoredUsers, saveStoredUsers } from '@/lib/users-server';

type ResetPasswordPayload = {
  token?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { token, password } = (await req.json()) as ResetPasswordPayload;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    console.log('[reset-password] Attempting to validate token:', { token: token.substring(0, 10) + '...' });
    
    const record = await validatePasswordResetToken(token);
    if (!record) {
      console.error('[reset-password] Token validation failed');
      return NextResponse.json(
        { 
          error: 'Reset link is invalid or expired.',
          ...(process.env.NODE_ENV === 'development' && {
            details: 'Token not found in storage. Check if Upstash is configured and token was saved correctly.',
          }),
        },
        { status: 400 }
      );
    }
    
    console.log('[reset-password] Token validated successfully for:', record.email);

    const users = await getStoredUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === record.email.toLowerCase());

    if (index === -1) {
      await markPasswordResetTokenUsed(token);
      return NextResponse.json({ error: 'Account no longer exists.' }, { status: 404 });
    }

    const updatedUsers = [...users];
    updatedUsers[index] = {
      ...users[index],
      password,
      lastLoginAt: users[index].lastLoginAt,
    };

    await saveStoredUsers(updatedUsers);
    await markPasswordResetTokenUsed(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[reset-password] Error:', error);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}


