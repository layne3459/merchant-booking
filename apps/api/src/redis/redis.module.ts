import { Global, Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly memory = new Map<string, { value: string; expireAt?: number }>();
  private readonly memoryLocks = new Set<string>();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (url) {
      try {
        this.client = new Redis(url, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });
        this.client.connect().catch(() => {
          this.logger.warn('Redis unavailable, using in-memory fallback');
          this.client = null;
        });
      } catch {
        this.logger.warn('Redis init failed, using in-memory fallback');
      }
    }
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  private cleanMemory() {
    const now = Date.now();
    for (const [key, item] of this.memory.entries()) {
      if (item.expireAt && item.expireAt <= now) {
        this.memory.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client) {
      return this.client.get(key);
    }
    this.cleanMemory();
    const item = this.memory.get(key);
    if (!item) return null;
    if (item.expireAt && item.expireAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client) {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
      return;
    }
    this.memory.set(key, {
      value,
      expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client) {
      await this.client.del(key);
      return;
    }
    this.memory.delete(key);
  }

  async withLock<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const acquired = await this.tryLock(key, ttlSeconds);
    if (!acquired) {
      throw new Error('LOCK_BUSY');
    }
    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }

  private async tryLock(key: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = `lock:${key}`;
    if (this.client) {
      const result = await this.client.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    }
    if (this.memoryLocks.has(lockKey)) return false;
    this.memoryLocks.add(lockKey);
    setTimeout(() => this.memoryLocks.delete(lockKey), ttlSeconds * 1000);
    return true;
  }

  private async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    if (this.client) {
      await this.client.del(lockKey);
      return;
    }
    this.memoryLocks.delete(lockKey);
  }
}

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
