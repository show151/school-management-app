import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  // CRON_SECRET で不正アクセスを防ぐ
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret') ?? request.headers.get('x-cron-secret');

  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret || secret !== configuredSecret) {
    if (!configuredSecret) {
      console.error('❌ CRON_SECRET is not set in environment variables');
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // 1. 締め切り翌日以降 かつ 完了済み のレコードをDBから物理削除
  //    （締め切り当日中は完了済みでも残す）
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 今日の0:00
  const expiredCompleted = await prisma.task.deleteMany({
    where: {
      isCompleted: true,
      dueDate: { lt: startOfToday }, // 締め切り翌日の0:00を過ぎたもの
    },
  });

  // 2. adminBatchId ごとに「全員完了しているバッチ」を削除
  //    ※ 期限内でも全員完了済みのバッチを掃除する
  const allTasks = await prisma.task.findMany({
    select: { adminBatchId: true, isCompleted: true },
    where: { adminBatchId: { not: null } },
  });

  // adminBatchId ごとに集計
  const batchMap = new Map<string, { total: number; completed: number }>();
  for (const t of allTasks) {
    if (!t.adminBatchId) continue;
    const entry = batchMap.get(t.adminBatchId) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (t.isCompleted) entry.completed += 1;
    batchMap.set(t.adminBatchId, entry);
  }

  const fullyCompletedBatchIds = [...batchMap.entries()]
    .filter(([, { total, completed }]) => total > 0 && total === completed)
    .map(([batchId]) => batchId);

  let batchDeletedCount = 0;
  if (fullyCompletedBatchIds.length > 0) {
    const result = await prisma.task.deleteMany({
      where: { adminBatchId: { in: fullyCompletedBatchIds } },
    });
    batchDeletedCount = result.count;
    console.log(`🗑️ Task cleanup: deleted ${batchDeletedCount} records from ${fullyCompletedBatchIds.length} fully-completed batches.`);
  }

  console.log(`🧹 Task cleanup cron: expired+completed deleted=${expiredCompleted.count}, batch-fully-completed deleted=${batchDeletedCount}`);

  return NextResponse.json({
    expiredCompletedDeleted: expiredCompleted.count,
    fullyCompletedBatchIds,
    batchRecordsDeleted: batchDeletedCount,
  });
}
