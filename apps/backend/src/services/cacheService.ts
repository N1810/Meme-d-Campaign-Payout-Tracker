import Redis from 'ioredis';

/**
 * Resilient Redis Cache Service
 * Fails gracefully if Redis is unavailable without disrupting core operations.
 */
class CacheService {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && redisUrl.trim().length > 0) {
      try {
        this.client = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          console.log('[Redis] Connected successfully');
        });

        this.client.on('error', (err) => {
          this.isConnected = false;
          // Silent or low-noise warning to preserve reliability
          if (process.env.NODE_ENV !== 'test') {
            console.warn('[Redis] Connection warning (running in no-cache fallback mode):', err.message);
          }
        });

        this.client.connect().catch(() => {
          this.isConnected = false;
        });
      } catch (err) {
        this.isConnected = false;
      }
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  public async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Ignored: fallback to direct DB queries
    }
  }

  public async del(keyPatternOrKey: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      if (keyPatternOrKey.includes('*')) {
        const keys = await this.client.keys(keyPatternOrKey);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } else {
        await this.client.del(keyPatternOrKey);
      }
    } catch {
      // Ignored
    }
  }

  public async invalidateCampaigns(): Promise<void> {
    await this.del('campaigns:*');
  }
}

export const cacheService = new CacheService();
