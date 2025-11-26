import { NextResponse } from 'next/server';
import { upstash } from '@/lib/upstash';

const USERS_KEY = 'schulplaner:users';

// GET /api/kv-status - Check if KV/Upstash is configured and working
export async function GET() {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  const isConfigured = !!(kvUrl && kvToken);
  
  if (!isConfigured) {
    return NextResponse.json({
      configured: false,
      message: 'KV/Upstash not configured - missing environment variables',
      variables: {
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN,
        hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      }
    });
  }
  
  // Test connection by trying to read from Upstash
  try {
    const testValue = await upstash.get(USERS_KEY);
    const userCount = Array.isArray(testValue) ? testValue.length : 0;
    
    return NextResponse.json({
      configured: true,
      connected: true,
      message: 'KV/Upstash is configured and connected',
      userCount,
      variables: {
        usingKvUrl: !!process.env.KV_REST_API_URL,
        usingUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('[kv-status] Connection test failed:', error);
    return NextResponse.json({
      configured: true,
      connected: false,
      message: 'KV/Upstash is configured but connection failed',
      error: message,
      errorDetails,
      variables: {
        usingKvUrl: !!process.env.KV_REST_API_URL,
        usingUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        kvUrlSet: !!process.env.KV_REST_API_URL,
        kvTokenSet: !!process.env.KV_REST_API_TOKEN,
      }
    });
  }
}

