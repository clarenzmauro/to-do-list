import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client - only if environment variables are available
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Cache utilities - only available if Redis is configured
export const cache = {
  isAvailable: () => redis !== null,

  // Cache a value with TTL (time to live in seconds)
  async set(key: string, value: any, ttlSeconds: number = 300) {
    if (!redis) throw new Error('Redis not configured');
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  // Get a cached value
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    const value = await redis.get(key);
    if (value === null || value === undefined || value === '') {
      return null;
    }
    // Handle case where Redis might return an empty object
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return null;
    }
    return JSON.parse(value as string);
  },

  // Delete a cached value
  async del(key: string) {
    if (!redis) return;
    await redis.del(key);
  },

  // Rate limiting helper
  async increment(key: string, ttlSeconds: number = 60): Promise<number> {
    if (!redis) throw new Error('Redis not configured');
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return count;
  }
};

// Actions for Redis operations (safe for Convex actions)
import { action } from "./_generated/server";
import { v } from "convex/values";

export const getCache = action({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await cache.get(args.key);
  },
});

export const setCache = action({
  args: { key: v.string(), value: v.any(), ttlSeconds: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await cache.set(args.key, args.value, args.ttlSeconds || 300);
  },
});

export const deleteCache = action({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await cache.del(args.key);
  },
});

export const incrementRateLimit = action({
  args: { key: v.string(), ttlSeconds: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await cache.increment(args.key, args.ttlSeconds || 60);
  },
});
