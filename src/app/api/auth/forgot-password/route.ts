import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmail } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';
import { generateToken, getTokenExpiry } from '@/lib/token';

export async function POST(request: Request) {
  try {
    // レート制限チェック（IP アドレスベース）
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `${ip}:forgot-password`;
    
    // 1時間に5回まで
    if (!checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'リセット要求が多すぎます。少し時間をおいてから再度お試しください。' },
        { status: 429 }
      );
    }

    const { email } = await request.json();

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

    // ユーザーを更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // 📧 パスワードリセットメール送信
    const emailSent = await sendPasswordResetEmail(email, user.name, resetToken);

    if (!emailSent) {
      console.error('Failed to send password reset email for user:', user.id);
    }

    return NextResponse.json(
      { message: 'パスワードリセット用のリンクをメールで送信しました。メールをご確認ください。' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
