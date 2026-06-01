import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getRequiredEnv } from '@/lib/env';
import { validateName } from '@/lib/security';
import { getRequestMeta, recordAuditLog } from '@/lib/audit-log';

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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, studentNumber: true } });
  if (!user) return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, studentNumber } = body as { name?: string; studentNumber?: number | null | string };
  const data: { name?: string; studentNumber?: number | null } = {};

  if (typeof name !== 'undefined') {
    if (typeof name !== 'string') return NextResponse.json({ error: '名前を入力してください。' }, { status: 400 });
    if (!validateName(name)) return NextResponse.json({ error: '名前が無効です。' }, { status: 400 });
    data.name = name;
  }

  if (typeof studentNumber !== 'undefined') {
    if (studentNumber === '' || studentNumber === null) {
      data.studentNumber = null;
    } else {
      const parsed = typeof studentNumber === 'string' ? Number(studentNumber) : studentNumber;
      if (!Number.isInteger(parsed) || parsed < 1) {
        return NextResponse.json({ error: '出席番号は1以上の整数で入力してください。' }, { status: 400 });
      }
      data.studentNumber = parsed;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '更新内容がありません。' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({ where: { id: userId }, data });
    const { ipAddress, userAgent } = getRequestMeta(request);
    await recordAuditLog({
      actorType: 'user',
      actorId: updated.id,
      email: updated.email,
      action: 'user.profile.update',
      result: 'success',
      ipAddress,
      userAgent,
      details: data,
    });
    return NextResponse.json({ user: { id: updated.id, name: updated.name, email: updated.email, studentNumber: updated.studentNumber } });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'この出席番号はすでに使われています。' }, { status: 409 });
    }
    console.error('User update error', err);
    const { ipAddress, userAgent } = getRequestMeta(request);
    await recordAuditLog({
      actorType: 'user',
      actorId: userId,
      action: 'user.profile.update',
      result: 'failure',
      ipAddress,
      userAgent,
      details: { error: err instanceof Error ? err.message : 'unknown' },
    });
    return NextResponse.json({ error: '更新に失敗しました。' }, { status: 500 });
  }
}
