import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { validateEmail, validatePassword, validateName } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // レート制限チェック（IP アドレスベース）
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `${ip}:register`;
    
    // 1時間に10回まで
    if (!checkRateLimit(rateLimitKey, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: '登録の試行回数が多すぎます。少し時間をおいてから再度お試しください。' },
        { status: 429 }
      );
    }

    const { name, email, password } = await request.json();

    // ✅ 入力値の検証
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '名前、メールアドレス、パスワードを入力してください。' },
        { status: 400 }
      );
    }

    // ✅ 名前の検証
    if (!validateName(name)) {
      return NextResponse.json(
        { error: '名前は1文字以上100文字以下で入力してください。' },
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

    // ✅ パスワードの強度バリデーション
    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: 'パスワードは半角の大文字、小文字、数字、記号（@$!%*?&など）をすべて含む8文字以上で入力してください。' },
        { status: 400 }
      );
    }

    // メールの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています。' },
        { status: 400 }
      );
    }

    // 🔒 パスワードのハッシュ化（bcrypt、salt round: 10）
    const hashedPassword = await bcrypt.hash(password, 10);

    // データベースへの保存
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: 'ユーザー登録が完了しました。', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}