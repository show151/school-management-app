/**
 * シンプルなインメモリレート制限実装
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// レート制限のデータをメモリに保存（本番環境ではRedisを使用推奨）
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * レート制限をチェック
 * @param key - IP:エンドポイントなど
 * @param maxRequests - 最大リクエスト数
 * @param windowMs - 時間ウィンドウ（ミリ秒）
 * @returns true なら制限内、false なら制限超過
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000 // デフォルト: 1分間に5回
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // 新規またはリセット
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return true;
  }

  return false;
}

/**
 * レート制限情報をクリア（テスト用など）
 */
export function clearRateLimitMap(): void {
  rateLimitMap.clear();
}

/**
 * 古いエントリを定期的にクリーンアップ
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Note: do NOT run automatic intervals in serverless environments.
// If periodic cleanup is required, call `cleanupExpiredEntries()` from a
// background worker or a scheduled job (cron) in your deployment environment.
