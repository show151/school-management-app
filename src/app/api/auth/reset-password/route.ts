import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { validatePassword } from '@/lib/security';
import { isTokenExpired } from '@/lib/token';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'トークンとパスワードを入力してください。' },
        { status: 400 }
      );
    }

    // ✅ パスワードの強度バリデーション
    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: 'パスワードは半角の大文字、小文字、数字、記号（@$!%*?&など）をすべて含む8文字以上で入力してください。' },
        { status: 400 }
      );
    }

    // トークンでユーザーを検索
    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: '無効なリセットトークンです。' },
        { status: 404 }
      );
    }

    // トークンの有効期限をチェック
    if (isTokenExpired(user.resetTokenExpiry)) {
      return NextResponse.json(
        { error: 'リセットトークンの有効期限が切れています。もう一度パスワードリセットをリクエストしてください。' },
        { status: 400 }
      );
    }

    // 🔒 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザーのパスワードを更新、リセットトークンをクリア
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json(
      { message: 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
