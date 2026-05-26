import crypto from 'crypto';

/**
 * ランダムなトークンを生成
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * トークンの有効期限を計算（デフォルト：24時間後）
 */
export function getTokenExpiry(hours: number = 24): Date {
  const now = new Date();
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

/**
 * トークンが期限切れかチェック
 */
export function isTokenExpired(expiryDate: Date | null | undefined): boolean {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
}
