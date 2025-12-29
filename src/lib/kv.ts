// Vercel KV client using direct REST API calls
// Requires KV_REST_API_URL and KV_REST_API_TOKEN environment variables

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  throw new Error(
    'KV configuration missing: KV_REST_API_URL and KV_REST_API_TOKEN are required'
  );
}

class KVClient {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  isConfigured(): boolean {
    return !!(this.url && this.token);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`KV GET failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.result as T;
    } catch (error) {
      console.error('[KV] GET error:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const response = await fetch(`${this.url}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        throw new Error(`KV SET failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[KV] SET error:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      const response = await fetch(`${this.url}/del/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`KV DEL failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[KV] DEL error:', error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

export const kv = new KVClient(KV_REST_API_URL, KV_REST_API_TOKEN);
