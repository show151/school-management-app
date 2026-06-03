import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '@/lib/env';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

// ユーザーIDをトークンから安全に取得する共通関数
function getUserIdFromToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split('; ')
    .find((row) => row.startsWith('auth_token='))
    ?.split('=')[1];

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// 1. 課題の一覧取得 (GET)
export async function GET(request: Request) {
  const userId = getUserIdFromToken(request);
  if (!userId) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        // 締め切り翌日以降 かつ 完了済み の課題は自動的に非表示
        NOT: {
          AND: [
            { dueDate: { lt: startOfToday } },
            { isCompleted: true },
          ],
        },
      },
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: '取得に失敗しました。' }, { status: 500 });
  }
}

// 2. 課題の状態更新 (PUT) - 通常ユーザーは完了/未完了だけ変更できる
export async function PUT(request: Request) {
  const userId = getUserIdFromToken(request);
  if (!userId) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

  try {
    const { id, isCompleted } = await request.json();

    // 他人の課題を勝手に書き換えられないよう、userId も条件に含めて更新（認可の徹底）
    const updatedTask = await prisma.task.updateMany({
      where: { id, userId },
      data: { isCompleted },
    });

    // 完了にした場合、全員が完了しているか確認してバッチ全削除
    if (isCompleted) {
      // 更新した課題の adminBatchId を取得
      const task = await prisma.task.findUnique({ where: { id }, select: { adminBatchId: true } });
      if (task?.adminBatchId) {
        const batchId = task.adminBatchId;
        const [total, completed] = await Promise.all([
          prisma.task.count({ where: { adminBatchId: batchId } }),
          prisma.task.count({ where: { adminBatchId: batchId, isCompleted: true } }),
        ]);
        if (total > 0 && total === completed) {
          // 全員完了 → バッチをまるごと削除
          await prisma.task.deleteMany({ where: { adminBatchId: batchId } });
          console.log(`🗑️ Batch ${batchId} fully completed by all users. Deleted ${total} records.`);
          return NextResponse.json({ message: '更新しました。全員完了のため課題を削除しました。', updatedTask, batchDeleted: true });
        }
      }
    }

    return NextResponse.json({ message: '更新しました。', updatedTask });
  } catch {
    return NextResponse.json({ error: '更新に失敗しました。' }, { status: 500 });
  }
}
