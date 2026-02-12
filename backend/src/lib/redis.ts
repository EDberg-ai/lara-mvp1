import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn('REDIS_URL not set, Redis features will be disabled');
}

// Create Redis client with reconnection and error handling for Railway
export const redis = redisUrl ? new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    console.log(`Redis reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    if (targetErrors.some(e => err.message.includes(e))) {
      return true; // Reconnect
    }
    return false;
  },
}) : null;

// Handle Redis connection events
if (redis) {
  redis.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  redis.on('connect', () => {
    console.log('✓ Redis connected');
  });

  redis.on('reconnecting', () => {
    console.log('Redis reconnecting...');
  });
}

// Session TTL: 16 hours (student data is temporary)
export const SESSION_TTL = 16 * 60 * 60;

// Redis requirement helper for live session operations
export class RedisUnavailableError extends Error {
  constructor() {
    super('Redis is required for live session operations');
    this.name = 'RedisUnavailableError';
  }
}

export function requireRedis() {
  if (!redis) throw new RedisUnavailableError();
  return redis;
}

// Helper functions for session data
export const sessionKeys = {
  meta: (sessionId: string) => `session:${sessionId}:meta`,
  students: (sessionId: string) => `session:${sessionId}:students`,
  submission: (sessionId: string, studentId: string) => `session:${sessionId}:submissions:${studentId}`,
};

export default redis;
