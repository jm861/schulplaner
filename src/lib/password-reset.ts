import crypto from 'crypto';
import { kv } from '@/lib/kv';

export type PasswordResetRecord = {
  token: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
};

const TOKEN_PREFIX = 'schulplaner:reset-token:';
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const memoryTokens = new Map<string, PasswordResetRecord>();

function buildKey(token: string) {
  return `${TOKEN_PREFIX}${token}`;
}

async function saveRecord(record: PasswordResetRecord): Promise<void> {
  if (kv.isConfigured()) {
    try {
      await kv.set(buildKey(record.token), record);
      return;
    } catch (error) {
      console.error('[password-reset] Failed to persist token to Upstash:', error);
    }
  }

  memoryTokens.set(record.token, record);
}

async function deleteRecord(token: string): Promise<void> {
  if (kv.isConfigured()) {
    try {
      await kv.del(buildKey(token));
      return;
    } catch (error) {
      console.error('[password-reset] Failed to delete token from Upstash:', error);
    }
  }

  memoryTokens.delete(token);
}

async function readRecord(token: string): Promise<PasswordResetRecord | null> {
  let record: PasswordResetRecord | null = null;

  if (kv.isConfigured()) {
    try {
      record = await kv.get<PasswordResetRecord>(buildKey(token));
    } catch (error) {
      console.error('[password-reset] Failed to read token from Upstash:', error);
    }
  } else {
    record = memoryTokens.get(token) ?? null;
  }

  if (!record) {
    return null;
  }

  if (record.used || Date.now() > record.expiresAt) {
    await deleteRecord(token);
    return null;
  }

  return record;
}

export async function createPasswordResetToken(email: string): Promise<PasswordResetRecord> {
  const token = crypto.randomUUID();
  const now = Date.now();
  const record: PasswordResetRecord = {
    token,
    email: email.toLowerCase(),
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    used: false,
  };

  console.log('[password-reset] Creating token:', {
    token,
    email: email.toLowerCase(),
    expiresAt: new Date(record.expiresAt).toISOString(),
    usingKv: kv.isConfigured(),
  });

  await saveRecord(record);
  
  // Verify token was saved
  const saved = await readRecord(token);
  if (!saved) {
    console.error('[password-reset] WARNING: Token was not saved successfully!');
  } else {
    console.log('[password-reset] Token saved successfully');
  }
  
  return record;
}

export async function validatePasswordResetToken(token: string): Promise<PasswordResetRecord | null> {
  if (!token) {
    console.log('[password-reset] No token provided');
    return null;
  }
  
  console.log('[password-reset] Validating token:', {
    token,
    usingKv: kv.isConfigured(),
  });
  
  const record = await readRecord(token);
  
  if (!record) {
    console.log('[password-reset] Token not found or invalid');
  } else {
    console.log('[password-reset] Token found:', {
      email: record.email,
      createdAt: new Date(record.createdAt).toISOString(),
      expiresAt: new Date(record.expiresAt).toISOString(),
      used: record.used,
      isExpired: Date.now() > record.expiresAt,
    });
  }
  
  return record;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  const record = await readRecord(token);
  if (!record) return;
  await deleteRecord(token);
}


