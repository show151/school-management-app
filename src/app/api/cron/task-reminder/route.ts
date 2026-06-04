import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequiredEnv } from '@/lib/env';

export async function GET(request: Request) {
  // 1. Validate the cron secret
  const cronSecret = getRequiredEnv('CRON_SECRET');
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== cronSecret) {
    console.warn('Unauthorized attempt to access task reminder cron job.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Implement task reminder logic here
    //    Example: Fetch tasks that are not completed and due in the next 3 days.

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const tasksDueSoon = await prisma.task.findMany({
      where: {
        isCompleted: false,
        dueDate: {
          gte: today.toISOString(), // Due date is today or in the future
          lte: threeDaysFromNow.toISOString(), // Due date is within the next 3 days
        },
      },
      include: {
        user: {
          select: {
            email: true, // Select user email for notification
            name: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${tasksDueSoon.length} tasks due soon. Processing reminders...`);
    // TODO: Implement actual notification sending logic (e.g., email, push notification)
    // For example: for (const task of tasksDueSoon) { await sendReminder(task.user.email, task); }

    return NextResponse.json({ message: 'Task reminder process completed successfully.', tasksReminded: tasksDueSoon.length });
  } catch (error) {
    console.error('Error in task reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process task reminders.' }, { status: 500 });
  }
}