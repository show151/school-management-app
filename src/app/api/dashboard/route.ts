import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
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

    // 2. トークンをデコードして userId を抽出
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      const response = NextResponse.json(
        { error: '認証情報の有効期限が切れています。再ログインしてください。' },
        { status: 401 }
      );
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return response;
    }

    const userId = decoded.userId;

    const [tasks, announcements] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' }, // 締切が近い順
      }),
      prisma.announcement.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    ]);

    // 4. まとめてフロントエンドに返す
    return NextResponse.json({ tasks, announcements });
  } catch (error) {
    console.error('Dashboard Data Fetch Error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
  }
}
