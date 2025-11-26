import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { createPasswordResetToken } from '@/lib/password-reset';
import { getStoredUsers } from '@/lib/users-server';

type ForgotPasswordPayload = {
  email?: string;
};

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as ForgotPasswordPayload;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const users = await getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    // Return success regardless to avoid leaking account existence
    if (!user) {
      console.warn('[forgot-password] Requested email not found:', normalizedEmail);
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a reset email was sent.',
      });
    }

    const { token, expiresAt } = await createPasswordResetToken(normalizedEmail);
    const appUrl = getBaseUrl();
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    
    console.log('[forgot-password] Generated reset URL:', {
      appUrl,
      resetUrl,
      token: token.substring(0, 10) + '...',
      expiresAt: new Date(expiresAt).toISOString(),
    });
    const resendApiKey = process.env.RESEND_API_KEY;

    // Check if RESEND_API_KEY is configured
    if (!resendApiKey) {
      console.error('[forgot-password] RESEND_API_KEY is not configured');
      const errorMessage = 'Email service is not configured. Please contact support.';
      return NextResponse.json(
        {
          error: errorMessage,
          ...(process.env.NODE_ENV === 'development' && {
            details: 'RESEND_API_KEY environment variable is missing',
            resetUrl, // Include reset URL in dev mode for testing
          }),
        },
        { status: 500 }
      );
    }

    // Validate API key format (Resend keys start with 're_')
    if (!resendApiKey.startsWith('re_')) {
      console.error('[forgot-password] RESEND_API_KEY has invalid format');
      const errorMessage = 'Email service configuration is invalid. Please contact support.';
      return NextResponse.json(
        {
          error: errorMessage,
          ...(process.env.NODE_ENV === 'development' && {
            details: 'RESEND_API_KEY does not have expected format (should start with "re_")',
            resetUrl,
          }),
        },
        { status: 500 }
      );
    }

    // Attempt to send email via Resend
    try {
      console.log(`[forgot-password] Attempting to send reset email to ${normalizedEmail}`);
      const resend = new Resend(resendApiKey);
      
      // Use verified domain for from address
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'Schulplaner <noreply@meinplan.schule>';
      
      const emailResult = await resend.emails.send({
        from: fromAddress,
        to: normalizedEmail,
        subject: 'Schulplaner – Passwort zurücksetzen',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Passwort zurücksetzen</h2>
            <p>Hallo ${user.name || ''},</p>
            <p>du hast angefragt, dein Schulplaner-Passwort zurückzusetzen. Klicke auf den Button, um ein neues Passwort zu setzen:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 999px;">Passwort zurücksetzen</a>
            </p>
            <p>Oder kopiere diesen Link in deinen Browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
            <p>Der Link ist bis ${new Date(expiresAt).toLocaleString('de-DE')} gültig.</p>
            <p>Falls du dein Passwort nicht zurücksetzen wolltest, kannst du diese E-Mail ignorieren.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Schulplaner – Dein digitaler Schulplaner</p>
          </div>
        `,
      });

      // Check if Resend returned an error in the response
      if (emailResult.error) {
        throw new Error(`Resend API error: ${JSON.stringify(emailResult.error)}`);
      }

      console.log(`[forgot-password] Email sent successfully to ${normalizedEmail}:`, {
        id: emailResult.data?.id,
        from: fromAddress,
        to: normalizedEmail,
      });

      return NextResponse.json({
        success: true,
        message: 'If an account exists, a reset email was sent.',
        ...(process.env.NODE_ENV === 'development' && { token, resetUrl }),
      });
    } catch (emailError: unknown) {
      // Log full error details
      let errorDetails: Record<string, unknown>;
      
      if (emailError instanceof Error) {
        errorDetails = {
          message: emailError.message,
          name: emailError.name,
          stack: emailError.stack,
        };
        
        // Try to extract Resend-specific error information
        try {
          const errorObj = emailError as { response?: { data?: unknown }; data?: unknown };
          if (errorObj.response?.data) {
            errorDetails.resendError = errorObj.response.data;
          } else if (errorObj.data) {
            errorDetails.resendError = errorObj.data;
          }
        } catch {
          // Ignore if extraction fails
        }
      } else {
        errorDetails = { raw: String(emailError) };
      }
      
      console.error('[forgot-password] Resend API error:', {
        email: normalizedEmail,
        error: errorDetails,
        resetUrl,
      });

      // Extract user-friendly error message
      let userMessage = 'Failed to send reset email. Please try again later or contact support.';
      
      if (emailError instanceof Error) {
        const errorMsg = emailError.message.toLowerCase();
        if (errorMsg.includes('unauthorized') || errorMsg.includes('invalid api key')) {
          userMessage = 'Email service authentication failed. Please contact support.';
        } else if (errorMsg.includes('rate limit')) {
          userMessage = 'Too many requests. Please try again in a few minutes.';
        } else if (errorMsg.includes('domain') || errorMsg.includes('from')) {
          userMessage = 'Email service configuration error. Please contact support.';
        }
      }

      // Return error to client with details (for debugging)
      return NextResponse.json(
        {
          error: userMessage,
          // Always include details for debugging (can be removed in production if needed)
          details: errorDetails,
          ...(process.env.NODE_ENV === 'development' && {
            resetUrl, // Include reset URL in dev mode for testing
          }),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}


