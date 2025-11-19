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
  // KV not available
}

const USERS_KEY = 'schulplaner:users';

// GET /api/kv-status - Check if KV/Upstash is configured and working
export async function GET(req: NextRequest) {
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
  
  if (!kv) {
    return NextResponse.json({
      configured: false,
      message: 'KV/Upstash variables found but @vercel/kv module not available',
      variables: {
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN,
        hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      }
    });
  }
  
  // Test connection by trying to read from KV
  try {
    const testValue = await (kv as any).get(USERS_KEY);
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
  } catch (error: any) {
    return NextResponse.json({
      configured: true,
      connected: false,
      message: 'KV/Upstash is configured but connection failed',
      error: error?.message || 'Unknown error',
      variables: {
        usingKvUrl: !!process.env.KV_REST_API_URL,
        usingUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      }
    });
  }
}

