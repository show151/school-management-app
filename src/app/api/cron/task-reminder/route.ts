import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTaskReminderEmail } from '@/lib/email';

export async function GET(request: Request) {
  // CRON_SECRET で不正アクセスを防ぐ
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 明日の0:00〜23:59を範囲として取得
  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(now.getDate() + 1);
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

  for (const task of tasks) {
    const ok = await sendTaskReminderEmail(
      task.user.email,
      task.user.name,
      task.title,
      task.subject,
      task.dueDate,
    );
    ok ? sent++ : failed++;
  }

  console.log(`📧 Task reminder cron: sent=${sent}, failed=${failed}`);
  return NextResponse.json({ sent, failed, total: tasks.length });
}
