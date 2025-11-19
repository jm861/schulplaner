import { NextRequest, NextResponse } from 'next/server';
import { getVerificationCode, verifyCode } from '@/lib/verification';

type VerifyEmailPayload = {
  email: string;
  code: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyEmailPayload;
    const email = body.email?.trim().toLowerCase();
    const code = body.code?.trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required.' },
        { status: 400 },
      );
    }

    const stored = getVerificationCode(email);
    
    if (!stored) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 },
      );
    }

    if (Date.now() > stored.expiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    if (!verifyCode(email, code)) {
      return NextResponse.json(
        { error: 'Invalid verification code.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (error) {
    console.error('[verify-email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email.' },
      { status: 500 },
    );
  }
}

