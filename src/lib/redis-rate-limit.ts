import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
let redisClient: Redis | null = null;

if (redisUrl) {
  redisClient = new Redis(redisUrl);
}

/**
 * Redis を使ったシンプルなレート制限
 * 使用方法: return await redisRateLimit(key, maxRequests, windowSeconds)
 */
export async function redisRateLimit(
  key: string,
  maxRequests: number = 5,
  windowSeconds: number = 60
): Promise<boolean> {
  if (!redisClient) return true; // Redis が無効なら常に許可（呼び出し側でフォールバックする）

  const now = Math.floor(Date.now() / 1000);
  const redisKey = `rl:${key}:${Math.floor(now / windowSeconds)}`;

  const val = await redisClient.incr(redisKey);
  if (val === 1) {
    await redisClient.expire(redisKey, windowSeconds + 1);
  }

  return val <= maxRequests;
}

export function getRedisClient(): Redis | null {
  return redisClient;
}
