import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getRequiredEnv } from '@/lib/env';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

async function getUserId(request: Request): Promise<string | null> {
  const token = (request.headers.get('cookie') || '')
    .split('; ').find((r) => r.startsWith('auth_token='))?.split('=')[1];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return (payload as { userId?: string }).userId ?? null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

  const [announcements, reads] = await Promise.all([
    prisma.announcement.findMany({ orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    prisma.announcementRead.findMany({ where: { userId }, select: { announcementId: true } }),
  ]);

  const readIds = reads.map((r: { announcementId: string }) => r.announcementId);
  return NextResponse.json({ announcements, readIds });
}

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
