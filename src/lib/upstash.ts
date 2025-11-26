import { Redis } from '@upstash/redis';

// Upstash Redis client using official @upstash/redis package
// Works with both UPSTASH_REDIS_REST_URL/TOKEN and KV_REST_API_URL/TOKEN
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let redis: Redis | null = null;

try {
  if (url && token) {
    redis = new Redis({
      url,
      token,
    });
  }
} catch (error) {
  console.error('[Upstash] Failed to initialize:', error);
}

class UpstashClient {
  isConfigured(): boolean {
    return redis !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConfigured()) {
      throw new Error('Upstash not configured');
    }

    try {
      const client = redis!;
      const result = await client.get(key);
      if (result === null) {
        return null;
      }
      // If result is a string, try to parse it as JSON
      if (typeof result === 'string') {
        try {
          return JSON.parse(result) as T;
        } catch {
          return result as T;
        }
      }
      return result as T;
    } catch (error) {
      console.error('[Upstash] GET error:', error);
      throw error;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Upstash not configured');
    }

    try {
      // @upstash/redis handles JSON serialization automatically
      const client = redis!;
      await client.set(key, value);
    } catch (error) {
      console.error('[Upstash] SET error:', error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Upstash not configured');
    }

    try {
      const client = redis!;
      await client.del(key);
    } catch (error) {
      console.error('[Upstash] DEL error:', error);
      throw error;
    }
  }
}

export const upstash = new UpstashClient();

