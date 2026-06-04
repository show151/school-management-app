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
    //    Fetch tasks that are not completed and due on "tomorrow" in JST.
    //    Cron runs at 22:00 UTC, which is 07:00 JST the next day.
    //    So, "tomorrow" in JST refers to the day after the JST day the cron runs.

    const nowUTC = new Date(); // e.g., June 3rd, 22:00:00 UTC (which is June 4th, 07:00:00 JST)

    // Calculate the start of "tomorrow" in JST (e.g., June 5th, 00:00:00 JST) in UTC.
    // This corresponds to 22:00 UTC of the current UTC day + 1 day.
    const startOfTomorrowJST_inUTC = new Date(nowUTC);
    startOfTomorrowJST_inUTC.setUTCHours(22, 0, 0, 0); // Set to 22:00 UTC
    // If nowUTC is June 3rd, 22:00:00 UTC, startOfTomorrowJST_inUTC becomes June 3rd, 22:00:00 UTC.
    // We need the start of the *next* JST day, so add one more UTC day.
    startOfTomorrowJST_inUTC.setUTCDate(startOfTomorrowJST_inUTC.getUTCDate() + 1);
    // Now startOfTomorrowJST_inUTC is June 4th, 22:00:00 UTC (start of June 5th JST).

    // Calculate the end of "tomorrow" in JST (e.g., June 5th, 23:59:59.999 JST) in UTC.
    const endOfTomorrowJST_inUTC = new Date(startOfTomorrowJST_inUTC);
    endOfTomorrowJST_inUTC.setUTCDate(endOfTomorrowJST_inUTC.getUTCDate() + 1); // Move to the next UTC day (June 5th, 22:00:00 UTC)
    endOfTomorrowJST_inUTC.setUTCHours(21, 59, 59, 999); // Set to 21:59:59.999 UTC (June 5th, 21:59:59.999 UTC)

    const tasksDueSoon = await prisma.task.findMany({
      where: {
        isCompleted: false,
        dueDate: {
          gte: startOfTomorrowJST_inUTC.toISOString(), // Due date is tomorrow JST (start)
          lte: endOfTomorrowJST_inUTC.toISOString(), // Due date is tomorrow JST (end)
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

    console.log(`[Cron] Found ${tasksDueSoon.length} tasks due tomorrow (JST). Processing reminders...`);
    // TODO: Implement actual notification sending logic (e.g., email, push notification)
    // For example: for (const task of tasksDueSoon) { await sendReminder(task.user.email, task); }

    return NextResponse.json({ message: 'Task reminder process completed successfully.', tasksReminded: tasksDueSoon.length });
  } catch (error) {
    console.error('Error in task reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process task reminders.' }, { status: 500 });
  }
}