import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Edge Runtime で動作させるため jose を使用

// 環境変数から秘密鍵を取得し、jose で使える形式に変換
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is not set. Add it to your .env file.');
}

const JWT_SECRET = new TextEncoder().encode(
  jwtSecret
);

function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  return forwarded.split(',')[0]?.trim() || 'unknown';
}

function getAdminIpWhitelist(): Set<string> | null {
  const raw = process.env.ADMIN_IP_WHITELIST;
  if (!raw) return null;
  const entries = raw.split(',').map((value) => value.trim()).filter(Boolean);
  return entries.length > 0 ? new Set(entries) : null;
}

export async function middleware(request: NextRequest) {
  const userToken = request.cookies.get('auth_token')?.value;
  const adminToken = request.cookies.get('admin_token')?.value;
  const userLoginUrl = new URL('/', request.url);
  const adminLoginUrl = new URL('/', request.url);
  const pathname = request.nextUrl.pathname;
  const adminIpWhitelist = getAdminIpWhitelist();
  const clientIp = getRequestIp(request);

  const isAdminPath =
    (pathname.startsWith('/admin') && pathname !== '/admin/login') ||
    pathname.startsWith('/api/admin');

  if (adminIpWhitelist && (pathname.startsWith('/admin') || pathname.startsWith('/api/admin'))) {
    if (!adminIpWhitelist.has(clientIp)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (isAdminPath) {
    if (!adminToken) {
      return NextResponse.redirect(adminLoginUrl);
    }

    try {
      const { payload } = await jwtVerify(adminToken, JWT_SECRET);
      if (payload.role !== 'admin') throw new Error('Invalid admin token');
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(adminLoginUrl);
      response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
      return response;
    }
  }

  // 1. 保護したいルートの判定（通常ユーザー画面や、ユーザー操作API）
  const isUserProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/lessons') ||
    pathname.startsWith('/api/tasks') ||
    pathname.startsWith('/api/test-schedules');

  if (isUserProtectedPath) {
    // トークンがクッキーに存在しない場合は、ログイン画面へ強制リダイレクト
    if (!userToken) {
      return NextResponse.redirect(userLoginUrl);
    }

    try {
      // トークンの正当性を検証
      await jwtVerify(userToken, JWT_SECRET);

      // 検証が成功すれば、そのまま要求されたページやAPIに進む
      return NextResponse.next();
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ERR_JWT_EXPIRED'
      ) {
        console.log('【安全策】トークンの有効期限が切れています。自動ログアウト処理を実行します。');
        
        const response = NextResponse.redirect(userLoginUrl);
        // クッキーの maxAge を 0 にしてブラウザから完全に削除する
        response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        return response;
      }

      // トークンが改ざんされているなど、その他のエラーの場合もログイン画面へ
      const response = NextResponse.redirect(userLoginUrl);
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return response;
    }
  }

  // 保護されていないページ（ログイン画面など）はそのままアクセスを許可
  return NextResponse.next();
}

// ミドルウェアを適用するURLのパターンを指定
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*', 
    '/api/lessons/:path*', 
    '/api/tasks/:path*', 
    '/api/test-schedules/:path*'
  ],
};
