import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequiredEnv } from '@/lib/env';
import { sendTaskReminderEmail } from '@/lib/email';

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
    // 2. Fetch tasks that are not completed and due today or tomorrow in JST.
    const nowUTC = new Date();

    // Convert current UTC time to JST (+9 hours)
    const nowJST = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000);

    const jstYear = nowJST.getUTCFullYear();
    const jstMonth = nowJST.getUTCMonth();
    const jstDate = nowJST.getUTCDate();

    // Start of today in JST (which is 15:00 UTC of the previous day)
    const startOfTodayJST_inUTC = new Date(Date.UTC(jstYear, jstMonth, jstDate - 1, 15, 0, 0, 0));

    // End of tomorrow in JST (which is 14:59:59.999 UTC of tomorrow)
    const endOfTomorrowJST_inUTC = new Date(Date.UTC(jstYear, jstMonth, jstDate + 1, 14, 59, 59, 999));

    const tasksDueSoon = await prisma.task.findMany({
      where: {
        isCompleted: false,
        dueDate: {
          gte: startOfTodayJST_inUTC.toISOString(),
          lte: endOfTomorrowJST_inUTC.toISOString(),
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${tasksDueSoon.length} tasks due today or tomorrow (JST). Processing reminders...`);

    let sentCount = 0;
    let errorCount = 0;

    for (const task of tasksDueSoon) {
      if (task.user.email) {
        try {
          await sendTaskReminderEmail(
            task.user.email,
            task.user.name,
            task.title,
            task.subject,
            task.dueDate
          );
          sentCount++;
        } catch (error) {
          console.error(`Failed to send reminder for task ID ${task.id} to ${task.user.email}:`, error);
          errorCount++;
        }
      }
    }

    return NextResponse.json({ 
      message: 'Task reminder process completed successfully.', 
      tasksFound: tasksDueSoon.length,
      emailsSent: sentCount,
      errors: errorCount
    });
  } catch (error) {
    console.error('Error in task reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process task reminders.' }, { status: 500 });
  }
}