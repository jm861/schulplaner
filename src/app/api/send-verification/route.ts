import { NextRequest, NextResponse } from 'next/server';
import { generateVerificationCode, storeVerificationCode } from '@/lib/verification';

type SendVerificationPayload = {
  email: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendVerificationPayload;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 },
      );
    }

    // Generate 6-digit code
    const code = generateVerificationCode();
    storeVerificationCode(email, code);

    // In production, send email using a service like Resend, SendGrid, etc.
    // For now, we'll log it (you can implement actual email sending)
    console.log(`Verification code for ${email}: ${code}`);
    
    // TODO: Implement actual email sending
    // Example with Resend:
    // if (process.env.RESEND_API_KEY) {
    //   const resend = new Resend(process.env.RESEND_API_KEY);
    //   await resend.emails.send({
    //     from: 'noreply@schulplaner.de',
    //     to: email,
    //     subject: 'Schulplaner - Email Verification',
    //     html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
    //   });
    // }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent. Check your email.',
      // In development, return code for testing
      ...(process.env.NODE_ENV === 'development' && { code }),
    });
  } catch (error) {
    console.error('[send-verification] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code.' },
      { status: 500 },
    );
  }
}

