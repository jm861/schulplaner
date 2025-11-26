import { NextResponse } from 'next/server';

export async function GET() {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!resendApiKey,
    apiKeyFormat: resendApiKey ? (resendApiKey.startsWith('re_') ? 'valid' : 'invalid') : 'missing',
    apiKeyPreview: resendApiKey ? `${resendApiKey.substring(0, 10)}...` : null,
    nodeEnv: process.env.NODE_ENV,
  });
}

