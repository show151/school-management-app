import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmail } from '@/lib/security';
import { checkRateLimitWithRedisFallback } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';
import { generateToken, getTokenExpiry, hashToken } from '@/lib/token';
import { getRequestMeta, recordAuditLog } from '@/lib/audit-log';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email : '';

    // レート制限チェック（IP アドレスベース）
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `${ip}:forgot-password`;
    
    // 1時間に5回まで
    if (!(await checkRateLimitWithRedisFallback(rateLimitKey, 5, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: 'リセット要求が多すぎます。少し時間をおいてから再度お試しください。' },
        { status: 429 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスを入力してください。' },
        { status: 400 }
      );
    }

    // ✅ メールアドレスの検証
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください。' },
        { status: 400 }
      );
    }

    // ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合でも成功メッセージを返す
      return NextResponse.json(
        { message: 'パスワードリセット用のリンクをメールで送信しました。メールをご確認ください。' },
        { status: 200 }
      );
    }

    // 🔒 パスワードリセットトークンを生成
    const resetToken = generateToken();
    const resetTokenExpiry = getTokenExpiry(24); // 24時間有効
    const resetTokenHash = hashToken(resetToken);

    // ユーザーを更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      },
    });

    // 📧 パスワードリセットメール送信
    const emailSent = await sendPasswordResetEmail(email, user.name, resetToken);

    if (!emailSent) {
      console.error('Failed to send password reset email for user:', user.id);
    }

    const { ipAddress, userAgent } = getRequestMeta(request);
    await recordAuditLog({
      actorType: 'user',
      actorId: user.id,
      email,
      action: 'auth.password-reset.request',
      result: 'success',
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      { message: 'パスワードリセット用のリンクをメールで送信しました。メールをご確認ください。' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    const { ipAddress, userAgent } = getRequestMeta(request);
    await recordAuditLog({
      actorType: 'user',
      action: 'auth.password-reset.request',
      result: 'failure',
      ipAddress,
      userAgent,
      details: { error: error instanceof Error ? error.message : 'unknown' },
    });
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
