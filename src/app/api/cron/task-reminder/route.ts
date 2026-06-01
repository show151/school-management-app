import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTaskReminderEmail } from '@/lib/email';

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

  // 明日の0:00〜23:59を範囲として取得
  // 実行環境（サーバー）がUTCの場合を考慮し、日付計算を調整
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // 明日が締め切りで未完了の課題をユーザー情報ごと取得
  const tasks = await prisma.task.findMany({
    where: {
      isCompleted: false,
      dueDate: { gte: tomorrowStart, lte: tomorrowEnd },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  let sent = 0;
  let failed = 0;

  if (tasks.length === 0) {
    console.log('📧 Task reminder cron: no pending tasks found');
    return NextResponse.json({ sent, failed, total: 0 });
  }

  for (const task of tasks) {
    const ok = await sendTaskReminderEmail(
      task.user.email,
      task.user.name,
      task.title,
      task.subject,
      task.dueDate,
    );
    if (ok) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  console.log(`📧 Task reminder cron: sent=${sent}, failed=${failed}`);
  return NextResponse.json({ sent, failed, total: tasks.length });
}
