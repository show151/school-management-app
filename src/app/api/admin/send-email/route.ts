import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';
import {
  sendBulkTaskNotificationEmail,
  sendBulkTestNotificationEmail,
  sendBulkAnnouncementEmail,
} from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET || '';

interface SendEmailRequest {
  type: 'task' | 'test' | 'announcement';
  userIds: string[];
  studentNumbers?: number[];
  payload: {
    taskTitle?: string;
    dueDate?: string;
    subject?: string;
    testDate?: string;
    range?: string;
    title?: string;
    body?: string;
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

    // ユーザー情報を取得（ID と 出席番号 の両方をサポート）
    const userIdList = Array.isArray(body.userIds) ? body.userIds : [];
    const studentNumbers = Array.isArray(body.studentNumbers) ? body.studentNumbers : [];

    console.log('🔍 Looking for users with IDs:', userIdList, 'or studentNumbers:', studentNumbers);

    const usersById = userIdList.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIdList }, emailVerified: true },
      select: { id: true, email: true, name: true },
    }) : [];

    const usersByNumber = studentNumbers.length > 0 ? await prisma.user.findMany({
      where: { studentNumber: { in: studentNumbers }, emailVerified: true },
      select: { id: true, email: true, name: true },
    }) : [];

    // マージして重複を除去
    const usersMap: Record<string, { id: string; email: string; name: string }> = {};
    for (const u of [...usersById, ...usersByNumber]) {
      usersMap[u.id] = u;
    }
    const users = Object.values(usersMap);

    console.log('✅ Found users:', users.length);
    if (users.length === 0) {
      console.error('❌ No verified users found. Total userIds requested:', body.userIds.length);
      return NextResponse.json(
        { error: 'No verified users found. Make sure users are email verified.' },
        { status: 400 }
      );
    }

    const recipients = users.map(u => ({ email: u.email, name: u.name }));
    console.log('📬 Recipients:', recipients.map(r => r.email).join(', '));
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
          body.payload.range
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
