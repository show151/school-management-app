import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isTokenExpired } from '@/lib/token';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: '検証トークンが不足しています。' },
        { status: 400 }
      );
    }

    // トークンでユーザーを検索
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: '無効な検証トークンです。' },
        { status: 404 }
      );
    }

    // トークンの有効期限をチェック
    if (isTokenExpired(user.verificationTokenExpiry)) {
      return NextResponse.json(
        { error: '検証トークンの有効期限が切れています。もう一度登録してください。' },
        { status: 400 }
      );
    }

    // ユーザーのメールアドレスを確認済みにする
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return NextResponse.json(
      { message: 'メールアドレスの確認が完了しました。ログインしてください。' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
