import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

// GET /api/kv-status - Check if KV is configured and working
export async function GET() {
  const hasKvUrl = !!process.env.KV_REST_API_URL;
  const hasKvToken = !!process.env.KV_REST_API_TOKEN;
  const hasReadOnlyToken = !!process.env.KV_REST_API_READ_ONLY_TOKEN;
  
  const isConfigured = hasKvUrl && hasKvToken;
  
  if (!isConfigured) {
    return NextResponse.json({
      configured: false,
      message: 'KV not configured - missing environment variables',
      variables: {
        hasKvUrl,
        hasKvToken,
        hasReadOnlyToken,
      }
    });
  }
  
  // Test connection with a lightweight healthcheck
  try {
    await kv.get('__healthcheck__');
    
    return NextResponse.json({
      configured: true,
      ok: true,
      message: 'KV is configured and connected',
      variables: {
        hasKvUrl,
        hasKvToken,
        hasReadOnlyToken,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[kv-status] Connection test failed:', message);
    return NextResponse.json({
      configured: true,
      ok: false,
      message: 'KV is configured but connection failed',
      error: message,
      variables: {
        hasKvUrl,
        hasKvToken,
        hasReadOnlyToken,
      }
    });
  }
}

