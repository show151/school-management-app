import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';
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
  const adminSession = await getAdminSessionFromRequest(request);

  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [users, auditLogs, lessons, tasks, tests, subjects, announcements, announcementReads] = await Promise.all([
    safeFindMany(prisma.user.findMany({
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
    })),
    safeFindMany(prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } })),
    safeFindMany(prisma.lesson.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }] })),
    safeFindMany(prisma.task.findMany({ orderBy: { dueDate: 'asc' } })),
    safeFindMany(prisma.test.findMany({ orderBy: { testDate: 'asc' } })),
    safeFindMany(prisma.subject.findMany({ orderBy: { name: 'asc' } })),
    safeFindMany(prisma.announcement.findMany({ orderBy: { createdAt: 'asc' } })),
    safeFindMany(prisma.announcementRead.findMany({ orderBy: { readAt: 'asc' } })),
  ]);

  const payload = createBackupPayload({
    users,
    auditLogs,
    lessons,
    tasks,
    tests,
    subjects,
    announcements,
    announcementReads,
  });

  const fileName = `school-management-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}