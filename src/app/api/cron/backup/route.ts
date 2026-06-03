import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function createBackupPayload(data: Record<string, unknown>) {
  return {
    exportedAt: new Date().toISOString(),
    schema: 'school-management-app-backup-v1',
    data,
  };
}

async function safeFindMany<T>(query: Promise<T[]>): Promise<T[]> {
  try {
    return await query;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2021'
    ) {
      return [];
    }
    if (error instanceof Error && error.message.includes('TableDoesNotExist')) {
      return [];
    }
    throw error;
  }
}

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

  const [users, auditLogs, lessons, tasks, testSchedules, subjects, dailyLinks, announcements, announcementReads] =
    await Promise.all([
      safeFindMany(
        prisma.user.findMany({
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            studentNumber: true,
            name: true,
            email: true,
            password: true,
            isAdmin: true,
            emailVerified: true,
            verificationToken: true,
            verificationTokenExpiry: true,
            resetToken: true,
            resetTokenExpiry: true,
            createdAt: true,
          },
        })
      ),
      safeFindMany(prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } })),
      safeFindMany(prisma.lesson.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }] })),
      safeFindMany(prisma.task.findMany({ orderBy: { dueDate: 'asc' } })),
      safeFindMany(
        prisma.testSchedule.findMany({
          orderBy: { startDate: 'asc' },
          include: { entries: { orderBy: { period: 'asc' } } },
        })
      ),
      safeFindMany(prisma.subject.findMany({ orderBy: { name: 'asc' } })),
      safeFindMany(prisma.dailyLink.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })),
      safeFindMany(prisma.announcement.findMany({ orderBy: { createdAt: 'asc' } })),
      safeFindMany(prisma.announcementRead.findMany({ orderBy: { readAt: 'asc' } })),
    ]);

  const payload = createBackupPayload({
    users,
    auditLogs,
    lessons,
    tasks,
    testSchedules,
    subjects,
    dailyLinks,
    announcements,
    announcementReads,
  });

  const fileName = `school-management-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const jsonString = JSON.stringify(payload, null, 2);

  console.log(`✅ Backup cron completed: ${users.length} users, ${tasks.length} tasks, ${announcements.length} announcements. File: ${fileName}`);

  return new NextResponse(jsonString, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      'X-Backup-Exported-At': new Date().toISOString(),
      'X-Backup-Record-Count': String(
        users.length + tasks.length + announcements.length + lessons.length
      ),
    },
  });
}
