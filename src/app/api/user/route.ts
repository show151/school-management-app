import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getRequiredEnv } from '@/lib/env';
import { validateName } from '@/lib/security';

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
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  if (!user) return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name } = body as { name?: string };
  if (typeof name !== 'string') return NextResponse.json({ error: '名前を入力してください。' }, { status: 400 });
  if (!validateName(name)) return NextResponse.json({ error: '名前が無効です。' }, { status: 400 });

  try {
    const updated = await prisma.user.update({ where: { id: userId }, data: { name } });
    return NextResponse.json({ user: { id: updated.id, name: updated.name, email: updated.email } });
  } catch (err) {
    console.error('User update error', err);
    return NextResponse.json({ error: '更新に失敗しました。' }, { status: 500 });
  }
}
