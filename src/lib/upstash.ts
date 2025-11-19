// Upstash Redis REST API client
// Works with both UPSTASH_REDIS_REST_URL/TOKEN and KV_REST_API_URL/TOKEN

type UpstashResponse<T> = {
  result: T;
};

class UpstashClient {
  private url: string;
  private token: string;

  constructor() {
    this.url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  }

  isConfigured(): boolean {
    return !!(this.url && this.token);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConfigured()) {
      throw new Error('Upstash not configured');
    }

    try {
      const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upstash API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as UpstashResponse<T>;
      // Upstash returns null if key doesn't exist
      if (data.result === null) {
        return null;
      }
      // If result is a string, try to parse it as JSON
      if (typeof data.result === 'string') {
        try {
          return JSON.parse(data.result) as T;
        } catch {
          return data.result as T;
        }
      }
      return data.result as T;
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
      // Upstash REST API expects the value to be JSON stringified
      const jsonValue = JSON.stringify(value);
      
      const response = await fetch(`${this.url}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: jsonValue,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upstash API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      await response.json();
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
      const response = await fetch(`${this.url}/del/${encodeURIComponent(key)}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Upstash API error: ${response.status} ${response.statusText}`);
      }

      await response.json();
    } catch (error) {
      console.error('[Upstash] DEL error:', error);
      throw error;
    }
  }
}

export const upstash = new UpstashClient();

