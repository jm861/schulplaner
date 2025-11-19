// Upstash Redis client using official @upstash/redis package
// Works with both UPSTASH_REDIS_REST_URL/TOKEN and KV_REST_API_URL/TOKEN

let redis: any = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  
  if (url && token) {
    const { Redis } = require('@upstash/redis');
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
      const result = await redis.get(key);
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

  async set(key: string, value: any): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Upstash not configured');
    }

    try {
      // @upstash/redis handles JSON serialization automatically
      await redis.set(key, value);
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
      await redis.del(key);
    } catch (error) {
      console.error('[Upstash] DEL error:', error);
      throw error;
    }
  }
}

export const upstash = new UpstashClient();

