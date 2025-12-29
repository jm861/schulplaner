import { NextRequest, NextResponse } from 'next/server';

import { kv } from '@/lib/kv';
import type { DayData } from '@/types/schedule';

const BASE_KEY = 'schulplaner:schedule';

const buildKey = (userId: string) => `${BASE_KEY}:${userId}`;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (!kv.isConfigured()) {
    return NextResponse.json({ days: null });
  }

  try {
    const days = await kv.get<DayData[]>(buildKey(userId));
    return NextResponse.json({ days: days ?? null });
  } catch (error) {
    console.error('[schedule] Failed to load schedule from Upstash:', error);
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { userId?: string; days?: DayData[] };
    if (!body.userId || !Array.isArray(body.days)) {
      return NextResponse.json({ error: 'userId and days are required' }, { status: 400 });
    }

    if (!kv.isConfigured()) {
      return NextResponse.json({ error: 'Upstash is not configured' }, { status: 500 });
    }

    await kv.set(buildKey(body.userId), body.days);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[schedule] Failed to save schedule:', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}


