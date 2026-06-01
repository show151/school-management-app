import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { validateEmail, validatePassword, validateName } from '@/lib/security';
import { checkRateLimitWithRedisFallback } from '@/lib/rate-limit';
import { sendVerificationEmail, sendAdminNotificationEmail } from '@/lib/email';
import { generateToken, getTokenExpiry } from '@/lib/token';
import { getRequestMeta, recordAuditLog } from '@/lib/audit-log';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
  studentNumber?: number | string | null;
};

export async function POST(request: Request) {
  let body: RegisterBody = {};
  try {
    // レート制限チェック（IP アドレスベース）
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `${ip}:register`;
    
    // 1時間に10回まで
    if (!(await checkRateLimitWithRedisFallback(rateLimitKey, 10, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: '登録の試行回数が多すぎます。少し時間をおいてから再度お試しください。' },
        { status: 429 }
      );
    }

    body = await request.json().catch(() => ({}));
    const { name, email, password, studentNumber } = body;

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

    // 出席番号の重複チェック
    if (studentNumber) {
      const existingNumber = await prisma.user.findUnique({ where: { studentNumber: Number(studentNumber) } });
      if (existingNumber) {
        return NextResponse.json({ error: 'この出席番号は既に登録されています。' }, { status: 400 });
      }
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

    // 📧 メール認証トークンを生成
    const verificationToken = generateToken();
    const verificationTokenExpiry = getTokenExpiry(24); // 24時間有効

    // データベースへの保存
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        studentNumber: studentNumber ? Number(studentNumber) : null,
        verificationToken,
        verificationTokenExpiry,
        emailVerified: process.env.NODE_ENV !== 'production',
      },
    });

    const { ipAddress, userAgent } = getRequestMeta(request);
    await recordAuditLog({
      actorType: 'user',
      actorId: user.id,
      email,
      action: 'user.register',
      result: 'success',
      ipAddress,
      userAgent,
      details: { studentNumber: studentNumber ? Number(studentNumber) : null },
    });

    // 📧 メール認証メール送信
    const emailSent = await sendVerificationEmail(email, name, verificationToken);

    if (!emailSent) {
      console.error('Failed to send verification email for user:', user.id);
      // メール送信失敗でもユーザー作成は成功とする
      // (本番環境では別途ログや通知が必要)
    }

    // 📧 管理者に通知（管理者メールが設定されている場合のみ）
    if (ADMIN_EMAIL) {
      await sendAdminNotificationEmail(ADMIN_EMAIL, name, email);
    }

    return NextResponse.json(
      {
        message: '登録が完了しました。確認メールをお送りしましたので、メール内のリンクをクリックしてメールアドレスを確認してください。',
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register Error:', error);
    const { ipAddress, userAgent } = getRequestMeta(request);
    await recordAuditLog({
      actorType: 'user',
      action: 'user.register',
      result: 'failure',
      email: typeof body?.email === 'string' ? body.email : null,
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