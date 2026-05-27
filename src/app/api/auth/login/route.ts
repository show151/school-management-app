import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { getRequiredEnv } from '@/lib/env';
import { validateEmail } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';
import { redisRateLimit } from '@/lib/redis-rate-limit';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

export async function POST(request: Request) {
  try {
    // 🔒 レート制限チェック（ブルートフォース攻撃対策）
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `${ip}:login`;
    
    // 1時間に10回まで
    let allowed = true;
    if (process.env.REDIS_URL) {
      allowed = await redisRateLimit(rateLimitKey, 10, 60 * 60);
    } else {
      allowed = checkRateLimit(rateLimitKey, 10, 60 * 60 * 1000);
    }

    if (!allowed) {
      return NextResponse.json(
        { error: 'ログインの試行回数が多すぎます。少し時間をおいてから再度お試しください。' },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    // ✅ 入力値の検証
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードを入力してください。' },
        { status: 400 }
      );
    }

    // ✅ メールアドレスの形式検証
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません。' },
        { status: 401 }
      );
    }

    // ユーザーの検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません。' },
        { status: 401 }
      );
    }

    // � 📧 本番環境でのみメールアドレス確認をチェック（開発環境では確認不要）
    if (process.env.NODE_ENV === 'production' && !user.emailVerified) {
      return NextResponse.json(
        { error: 'メールアドレスがまだ確認されていません。登録時に送信されたメール内のリンクをクリックしてください。' },
        { status: 403 }
      );
    }

    // 🔒 パスワードの照合 (bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません。' },
        { status: 401 }
      );
    }

    // 🔒 JWT トークンの作成（有効期限を1時間にする） using jose
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    const response = NextResponse.json({
      message: 'ログインに成功しました。',
      user: { email: user.email },
    });

    // 🔒 クッキーにJWTを安全に保存 (HttpOnly, Secure, SameSite)
    response.cookies.set('auth_token', token, {
      httpOnly: true, // クライアント側のJSからトークンを隠蔽（XSS対策）
      secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
      sameSite: 'strict', // CSRF対策
      maxAge: 3600, // 1時間（JWTの有効期限と合わせる）
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
