import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import bcrypt from 'bcrypt';
import { getRequiredEnv } from '@/lib/env';
import { getRequestMeta, recordAuditLog } from '@/lib/audit-log';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader.split('; ').find((r) => r.startsWith('auth_token='))?.split('=')[1];
  if (!token) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

  let userId: string;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    userId = (payload as { userId?: string }).userId!;
  } catch {
    return NextResponse.json({ error: '認証の有効期限が切れています。' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '現在のパスワードと新しいパスワードを入力してください。' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: '新しいパスワードは8文字以上にしてください。' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: '現在のパスワードが正しくありません。' }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    const { ipAddress, userAgent } = getRequestMeta(request);
    await recordAuditLog({
      actorType: 'user',
      actorId: user.id,
      email: user.email,
      action: 'auth.password-change',
      result: 'success',
      ipAddress,
      userAgent,
    });

  return NextResponse.json({ message: 'パスワードを変更しました。' });
}
