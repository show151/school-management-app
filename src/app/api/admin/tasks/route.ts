import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type AdminTaskSummary = {
  batchId: string;
  subject: string;
  title: string;
  dueDate: Date;
  assignedCount: number;
  completedCount: number;
};

type TaskRow = Awaited<ReturnType<typeof prisma.task.findMany>>[number];

export async function GET(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    // Build-time data collection may call this route without cookies; return empty list.
    return NextResponse.json([]);
  }

  const tasks = await prisma.task.findMany({
    orderBy: { dueDate: "asc" },
  });

  const summaries = Array.from(
    tasks
      .reduce((map: Map<string, AdminTaskSummary>, task: TaskRow) => {
        const batchId = task.adminBatchId || task.id;
        const current =
          map.get(batchId) ||
          ({
            batchId,
            subject: task.subject,
            title: task.title,
            dueDate: task.dueDate,
            assignedCount: 0,
            completedCount: 0,
          } satisfies AdminTaskSummary);

        current.assignedCount += 1;
        if (task.isCompleted) current.completedCount += 1;
        map.set(batchId, current);

        return map;
      }, new Map<string, AdminTaskSummary>())
      .values()
  );

  return NextResponse.json(summaries);
}

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { subject, title, dueDate } = (await request.json()) as {
      subject?: string;
      title?: string;
      dueDate?: string;
    };

    if (!subject?.trim() || !title?.trim() || !dueDate) {
      return NextResponse.json({ error: "教科、課題名、締切日を入力してください。" }, { status: 400 });
    }

    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length === 0) {
      return NextResponse.json(
        { error: "課題を配布するユーザーがまだ登録されていません。" },
        { status: 400 }
      );
    }

    const adminBatchId = randomUUID();

    await prisma.task.createMany({
      data: users.map((user: { id: string }) => ({
        userId: user.id,
        adminBatchId,
        subject: subject.trim(),
        title: title.trim(),
        dueDate: new Date(dueDate),
        isCompleted: false,
      })),
    });

    return NextResponse.json(
      { message: "課題を登録しました。", adminBatchId, assignedCount: users.length },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "課題の登録に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { batchId } = (await request.json()) as { batchId?: string };
    if (!batchId) return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });

    await prisma.task.deleteMany({
      where: {
        OR: [{ adminBatchId: batchId }, { id: batchId }],
      },
    });

    return NextResponse.json({ message: "削除しました。" });
  } catch {
    return NextResponse.json({ error: "課題の削除に失敗しました。" }, { status: 500 });
  }
}
