/**
 * セキュリティ関連のユーティリティ関数
 */

/**
 * メールアドレスの厳密な検証
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * パスワードの厳密な検証
 * - 半角英大文字、小文字、数字、記号をそれぞれ1文字以上含む
 * - 8文字以上64文字以下
 */
export function validatePassword(password: string): boolean {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/;
  return passwordRegex.test(password);
}

/**
 * ユーザー名の検証
 * - 1文字以上100文字以下
 * - 危険な文字列を含まない
 */
export function validateName(name: string): boolean {
  if (name.length < 1 || name.length > 100) return false;
  // スクリプトタグなどの危険な文字列をチェック
  const dangerousPatterns = /<script|<iframe|javascript:|on\w+\s*=/gi;
  return !dangerousPatterns.test(name);
}

/**
 * 文字列のサニタイズ（HTMLエスケープ）
 */
export function sanitizeInput(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return input.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * レート制限用のキーを生成
 * IP アドレスとエンドポイントの組み合わせ
 */
export function generateRateLimitKey(ip: string, endpoint: string): string {
  return `${ip}:${endpoint}`;
}

/**
 * URLが有効かつ安全かチェックする（アプリリンク対応版）
 * 許可されたプロトコルのみを許可し、悪意のあるプロトコル（javascript:など）を拒否します。
 * @param url チェックするURL文字列
 * @returns URLが安全であれば true、そうでなければ false
 */
export function validateUrl(url: string): boolean {
  if (!url) return false;

  const trimmedUrl = url.trim();

  // 悪意のあるプロトコルを明示的に拒否
  if (/^(javascript|data|file):/i.test(trimmedUrl)) {
    return false;
  }

  // 許可するプロトコルのリスト（小文字で定義）
  const allowedSchemes = [
    'http',
    'https',
    'mailto',
    'tel',
    'zoommtg', // Zoomミーティング
    'slack',   // Slackアプリ
    'intent',  // Android App Links
    'msteams', // Teams デスクトップアプリ用
    // 必要に応じて他の安全なカスタムスキームを追加
  ];

  // URLをパースしてプロトコルをチェック
  try {
    const urlObj = new URL(trimmedUrl);
    const scheme = urlObj.protocol.slice(0, -1).toLowerCase(); // 末尾のコロンを除去し、小文字に変換
    return allowedSchemes.includes(scheme);
  } catch (e) {
    // URLパースエラー（不正な形式のURL）
    return false;
  }
}
