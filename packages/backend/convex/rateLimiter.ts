import { cache } from "./redis";

// Rate limiter configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
  keyPrefix?: string; // Prefix for Redis keys
}

// Default rate limit configurations
export const rateLimitConfigs = {
  // Strict limit for file uploads
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute
    keyPrefix: 'rl:upload:'
  },

  // General API rate limiting
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyPrefix: 'rl:api:'
  },

  // Auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 auth attempts per 15 minutes
    keyPrefix: 'rl:auth:'
  }
};

// Rate limiter function
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = rateLimitConfigs.api
): Promise<{ allowed: boolean; remainingRequests: number; resetTime: number }> {
  const key = `${config.keyPrefix || 'rl:'}${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Get current request count
    const count = await cache.increment(key);

    // Set expiry on first request
    if (count === 1) {
      await cache.set(key, count, Math.ceil(config.windowMs / 1000));
    }

    const allowed = count <= config.maxRequests;
    const remainingRequests = Math.max(0, config.maxRequests - count);
    const resetTime = now + config.windowMs;

    return {
      allowed,
      remainingRequests,
      resetTime
    };
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    console.warn('Rate limiting unavailable:', error);
    return {
      allowed: true,
      remainingRequests: config.maxRequests,
      resetTime: now + config.windowMs
    };
  }
}

// Convenience function for upload rate limiting
export async function checkUploadRateLimit(identifier: string) {
  return checkRateLimit(identifier, rateLimitConfigs.upload);
}

// Convenience function for API rate limiting
export async function checkApiRateLimit(identifier: string) {
  return checkRateLimit(identifier, rateLimitConfigs.api);
}

// Get client IP from request (for Convex actions, we'll use user ID or a generated identifier)
export function getRateLimitIdentifier(ctx: any): string {
  // For Convex mutations/actions, we can use the user ID if available, otherwise use a session-based identifier
  // Since we don't have direct access to IP in Convex, we'll use user ID or generate a simple identifier
  return ctx.auth?.userId || 'anonymous';
}

// Rate limit check for mutations (throws error if limit exceeded)
export async function enforceRateLimit(
  ctx: any,
  config: RateLimitConfig = rateLimitConfigs.api
): Promise<void> {
  const identifier = getRateLimitIdentifier(ctx);
  const rateLimitResult = await checkRateLimit(identifier, config);

  if (!rateLimitResult.allowed) {
    throw new Error(`Rate limit exceeded. ${rateLimitResult.remainingRequests} requests remaining. Try again in ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.`);
  }
}
