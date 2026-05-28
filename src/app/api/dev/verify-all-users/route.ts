// 開発用エンドポイント: 全ユーザーのメール認証状態を有効にする
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  // 本番環境では実行を許可しない
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const result = await prisma.user.updateMany({
      data: {
        emailVerified: true,
      },
    });

    console.log(`✅ Verified ${result.count} users`);

    return NextResponse.json({
      success: true,
      message: `Verified ${result.count} users`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error verifying users:', error);
    return NextResponse.json(
      { error: 'Failed to verify users' },
      { status: 500 }
    );
  }
}
