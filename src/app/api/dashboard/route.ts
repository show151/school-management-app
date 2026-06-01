import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getRequiredEnv } from '@/lib/env';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

async function getUserId(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader.split('; ').find((r) => r.startsWith('auth_token='))?.split('=')[1];
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return (payload as { userId?: string }).userId ?? null;
  } catch { return null; }
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.split('; ').find((r) => r.startsWith('auth_token='))?.split('=')[1];
    if (!token) return NextResponse.json({ error: '認証トークンがありません。' }, { status: 401 });

    let userId: string;
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      const p = payload as { userId?: string };
      if (!p.userId) {
        const res = NextResponse.json({ error: '認証情報が不正です。' }, { status: 401 });
        res.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        return res;
      }
      userId = p.userId;
    } catch {
      const res = NextResponse.json({ error: '認証情報の有効期限が切れています。' }, { status: 401 });
      res.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return res;
    }

    // admin判定
    const adminToken = cookieHeader.split('; ').find((r) => r.startsWith('admin_token='))?.split('=')[1];
    let isAdmin = false;
    if (adminToken) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(adminToken, secret);
        isAdmin = (payload as { role?: string }).role === 'admin';
      } catch { /* ignore */ }
    }

    const [tasks, announcements, lessons, tests, reads, dailyLinks] = await Promise.all([
      prisma.task.findMany({ where: { userId }, orderBy: { dueDate: 'asc' }, take: 3 }),
      prisma.announcement.findMany({ orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 3 }),
      prisma.lesson.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }] }),
      prisma.test.findMany({ where: { userId }, orderBy: { testDate: 'asc' }, take: 3 }),
      prisma.announcementRead.findMany({ where: { userId }, select: { announcementId: true } }),
      prisma.dailyLink.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    ]);

    const readIds = reads.map((r: { announcementId: string }) => r.announcementId);

    return NextResponse.json({ tasks, announcements, lessons, tests, readIds, isAdmin, dailyLinks });
  } catch (error) {
    console.error('Dashboard Data Fetch Error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
  }
}

// 既読登録
export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

  const { announcementId } = await request.json();
  if (!announcementId) return NextResponse.json({ error: 'IDが必要です。' }, { status: 400 });

  await prisma.announcementRead.upsert({
    where: { userId_announcementId: { userId, announcementId } },
    create: { userId, announcementId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
