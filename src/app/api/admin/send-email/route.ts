import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';
import {
  sendBulkTaskNotificationEmail,
  sendBulkTestNotificationEmail,
  sendBulkTestScheduleNotificationEmail,
  sendBulkAnnouncementEmail,
  sendBulkAnnouncementUpdateEmail,
  sendBulkTaskDueDateUpdateEmail,
  sendBulkTestScheduleUpdateEmail,
} from '@/lib/email';

interface SendEmailRequest {
  type: 'task' | 'test' | 'testSchedule' | 'announcement' | 'announcementUpdate' | 'taskDueDateUpdate' | 'testScheduleUpdate';
  userIds: string[];
  studentNumberFrom?: number;
  studentNumberTo?: number;
  payload: {
    taskTitle?: string;
    dueDate?: string;
    subject?: string;
    testDate?: string;
    range?: string;
    note?: string;
    title?: string;
    body?: string;
    scheduleTitle?: string;
    scheduleId?: string;
    startDate?: string;
    endDate?: string;
  };
}

export async function POST(request: Request) {
  try {
    // 認証チェック - 統一されたヘルパーを使用
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      console.error('❌ Unauthorized request to send-email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SendEmailRequest = await request.json();

    console.log('📤 Received request body:', JSON.stringify(body, null, 2));
    
    if (!body.type || !Array.isArray(body.userIds) || !body.payload) {
      console.error('❌ Validation failed - Missing required fields');
      console.error('  - type:', body.type);
      console.error('  - userIds:', body.userIds);
      console.error('  - payload:', body.payload);
      return NextResponse.json(
        { error: 'Missing required fields: type, userIds, payload' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    let users;
    // If a student number range is provided, use it to select users
    if (typeof body.studentNumberFrom !== 'undefined' || typeof body.studentNumberTo !== 'undefined') {
      const from = typeof body.studentNumberFrom !== 'undefined' ? Number(body.studentNumberFrom) : undefined;
      const to = typeof body.studentNumberTo !== 'undefined' ? Number(body.studentNumberTo) : undefined;
      const whereClause: Prisma.UserWhereInput = { emailVerified: true };
      if (typeof from === 'number' && typeof to === 'number') {
        whereClause.studentNumber = { gte: from, lte: to };
      } else if (typeof from === 'number') {
        whereClause.studentNumber = { gte: from };
      } else if (typeof to === 'number') {
        whereClause.studentNumber = { lte: to };
      }
      console.log('🔍 Looking for users by studentNumber range:', { from, to });
      users = await prisma.user.findMany({ where: whereClause, select: { id: true, email: true, name: true } });
    } else if (Array.isArray(body.userIds) && body.userIds.includes('ALL')) {
      console.log('🔍 Sending to ALL verified users');
      users = await prisma.user.findMany({
        where: { emailVerified: true },
        select: { id: true, email: true, name: true },
      });
    } else {
      console.log('🔍 Looking for users with IDs:', body.userIds);
      users = await prisma.user.findMany({
        where: {
          id: { in: body.userIds },
          emailVerified: true, // 検証済みユーザーのみ
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }

    console.log('✅ Found users:', users.length);
    if (users.length === 0) {
      console.error('❌ No verified users found. Total userIds requested:', body.userIds.length);
      return NextResponse.json(
        { error: 'No verified users found. Make sure users are email verified.' },
        { status: 400 }
      );
    }

    const recipients = users.map((u: { email: string; name: string }) => ({ email: u.email, name: u.name }));
    console.log('📬 Recipients:', recipients.map((r: { email: string }) => r.email).join(', '));
    let result;

    switch (body.type) {
      case 'task':
        if (!body.payload.taskTitle || !body.payload.dueDate) {
          console.error('❌ Task validation failed - Missing taskTitle or dueDate');
          console.error('  - taskTitle:', body.payload.taskTitle);
          console.error('  - dueDate:', body.payload.dueDate);
          return NextResponse.json(
            { error: 'Missing taskTitle or dueDate in payload' },
            { status: 400 }
          );
        }
        result = await sendBulkTaskNotificationEmail(
          recipients,
          body.payload.taskTitle,
          new Date(body.payload.dueDate)
        );
        break;

      case 'test':
        if (!body.payload.subject || !body.payload.testDate || !body.payload.range) {
          console.error('❌ Test validation failed - Missing required fields');
          console.error('  - subject:', body.payload.subject);
          console.error('  - testDate:', body.payload.testDate);
          console.error('  - range:', body.payload.range);
          return NextResponse.json(
            { error: 'Missing subject, testDate, or range in payload' },
            { status: 400 }
          );
        }
        result = await sendBulkTestNotificationEmail(
          recipients,
          body.payload.subject,
          new Date(body.payload.testDate),
          body.payload.range,
          body.payload.note ?? undefined
        );
        break;

      case 'testSchedule':
        if (!body.payload.scheduleTitle || !body.payload.scheduleId || !body.payload.startDate || !body.payload.endDate) {
          return NextResponse.json(
            { error: 'Missing scheduleTitle, scheduleId, startDate, or endDate in payload' },
            { status: 400 }
          );
        }
        result = await sendBulkTestScheduleNotificationEmail(
          recipients,
          body.payload.scheduleTitle,
          new Date(body.payload.startDate),
          new Date(body.payload.endDate),
          body.payload.scheduleId
        );
        break;

      case 'announcement':
        if (!body.payload.title || !body.payload.body) {
          console.error('❌ Announcement validation failed - Missing title or body');
          console.error('  - title:', body.payload.title);
          console.error('  - body:', body.payload.body);
          return NextResponse.json(
            { error: 'Missing title or body in payload' },
            { status: 400 }
          );
        }
        result = await sendBulkAnnouncementEmail(
          recipients,
          body.payload.title,
          body.payload.body
        );
        break;

      case 'announcementUpdate':
        if (!body.payload.title || !body.payload.body) {
          return NextResponse.json({ error: 'Missing title or body in payload' }, { status: 400 });
        }
        result = await sendBulkAnnouncementUpdateEmail(recipients, body.payload.title, body.payload.body);
        break;

      case 'taskDueDateUpdate':
        if (!body.payload.taskTitle || !body.payload.dueDate || !body.payload.subject) {
          return NextResponse.json({ error: 'Missing taskTitle, subject or dueDate in payload' }, { status: 400 });
        }
        result = await sendBulkTaskDueDateUpdateEmail(recipients, body.payload.taskTitle, body.payload.subject, new Date(body.payload.dueDate));
        break;

      case 'testScheduleUpdate':
        if (!body.payload.scheduleTitle || !body.payload.scheduleId || !body.payload.startDate || !body.payload.endDate) {
          return NextResponse.json({ error: 'Missing scheduleTitle, scheduleId, startDate or endDate in payload' }, { status: 400 });
        }
        result = await sendBulkTestScheduleUpdateEmail(recipients, body.payload.scheduleTitle, new Date(body.payload.startDate), new Date(body.payload.endDate), body.payload.scheduleId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        );
    }

    return NextResponse.json(
      {
        message: `Email sent to ${result.success} users`,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error sending emails:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { 
        error: 'Failed to send emails',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
