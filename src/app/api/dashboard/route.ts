import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getRequiredEnv } from '@/lib/env';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

export async function GET(request: Request) {
  try {
    // 1. リクエストのクッキーからトークンを取得
    // ※本来はMiddlewareを通過していますが、API内部でも安全のためにユーザーIDを特定します
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader
      .split('; ')
      .find((row) => row.startsWith('auth_token='))
      ?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: '認証トークンがありません。' }, { status: 401 });
    }

    // 2. トークンをデコードして userId を抽出 (jose を使用)
    let userId: string;
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const verified = await jwtVerify(token, secret);
      // payload は SignJWT でセットしたオブジェクト
      const payload = verified.payload as { userId?: string };
      if (!payload.userId) {
        const response = NextResponse.json(
          { error: '認証情報が不正です。' },
          { status: 401 }
        );
        response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        return response;
      }
      userId = payload.userId;
    } catch (err) {
      const response = NextResponse.json(
        { error: '認証情報の有効期限が切れています。再ログインしてください。' },
        { status: 401 }
      );
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return response;
    }

    // admin_token の有無で管理者かどうか判定
    const adminToken = cookieHeader
      .split('; ')
      .find((row) => row.startsWith('admin_token='))
      ?.split('=')[1];
    let isAdmin = false;
    if (adminToken) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(adminToken, secret);
        isAdmin = (payload as { role?: string }).role === 'admin';
      } catch { /* 無効なトークンは無視 */ }
    }

    const [tasks, announcements, lessons] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.announcement.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      prisma.lesson.findMany({
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
      }),
    ]);

    return NextResponse.json({ tasks, announcements, lessons, isAdmin });
  } catch (error) {
    console.error('Dashboard Data Fetch Error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
  }
}
