import { NextResponse } from 'next/server';
import { getRequestMeta, recordAuditLog } from '@/lib/audit-log';

export async function POST(request: Request) {
  try {
    const response = NextResponse.json({ message: 'ログアウトしました。' });

    // クッキーを即座に無効化（削除）する
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
    // 管理者用トークンも念のため削除
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    const { ipAddress, userAgent } = getRequestMeta(request);
    await recordAuditLog({
      actorType: 'user',
      action: 'auth.logout',
      result: 'success',
      ipAddress,
      userAgent,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
