import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
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

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        // Use verified domain for from address
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'Schulplaner <noreply@meinplan.schule>';
        
        await resend.emails.send({
          from: fromAddress,
          to: email,
          subject: 'Schulplaner - E-Mail-Verifizierung',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">E-Mail-Verifizierung</h2>
              <p>Hallo,</p>
              <p>dein Verifizierungscode für den Schulplaner lautet:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
              </div>
              <p>Dieser Code ist 10 Minuten gültig.</p>
              <p>Falls du diese E-Mail nicht angefordert hast, kannst du sie ignorieren.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">Schulplaner - Dein digitaler Schulplaner</p>
            </div>
          `,
        });
        console.log(`[send-verification] Verification code sent to ${email} via Resend`);
      } catch (emailError) {
        console.error('[send-verification] Resend error:', emailError);
        // Fallback: log code in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[send-verification] Fallback - Verification code for ${email}: ${code}`);
        }
      }
    } else {
      // Fallback: log code if Resend is not configured
      console.log(`[send-verification] RESEND_API_KEY not configured. Verification code for ${email}: ${code}`);
    }

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

