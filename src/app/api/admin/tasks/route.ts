import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type AdminTaskSummary = {
  batchId: string;
  subject: string;
  title: string;
  dueDate: Date | null;
  note: string | null;
  assignedCount: number;
  completedCount: number;
  assignedUserIds: string[];
  sourceProvider?: string | null;
};

type TaskRow = Awaited<ReturnType<typeof prisma.task.findMany>>[number];

function classroomGroupKey(task: Pick<TaskRow, "sourceProvider" | "sourceGroupId" | "sourceExternalId">) {
  if (task.sourceProvider === "classroom" && task.sourceGroupId && task.sourceExternalId) {
    return `classroom:${task.sourceGroupId}:${task.sourceExternalId}`;
  }
  return null;
}

function taskGroupWhere(groupId: string) {
  if (groupId.startsWith("classroom:")) {
    const [, sourceGroupId, ...externalIdParts] = groupId.split(":");
    const sourceExternalId = externalIdParts.join(":");
    if (sourceGroupId && sourceExternalId) {
      return { sourceProvider: "classroom", sourceGroupId, sourceExternalId };
    }
  }
  return { OR: [{ adminBatchId: groupId }, { id: groupId }] };
}

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
        const batchId = classroomGroupKey(task) || task.adminBatchId || task.id;
        const current =
          map.get(batchId) ||
          ({
            batchId,
            subject: task.subject,
            title: task.title,
            dueDate: task.dueDate,
            note: task.note ?? null,
            assignedCount: 0,
            completedCount: 0,
            assignedUserIds: [],
            sourceProvider: task.sourceProvider,
          } satisfies AdminTaskSummary);

        current.assignedCount += 1;
        if (task.isCompleted) current.completedCount += 1;
        if (!current.assignedUserIds.includes(task.userId)) {
          current.assignedUserIds.push(task.userId);
        }
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
    const { subject, title, dueDate, note } = (await request.json()) as {
      subject?: string;
      title?: string;
      dueDate?: string;
      note?: string;
    };

    if (!subject?.trim() || !title?.trim()) {
      return NextResponse.json({ error: "教科と課題名を入力してください。" }, { status: 400 });
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
        dueDate: dueDate ? new Date(dueDate) : null,
        note: note?.trim() || null,
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

export async function PATCH(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { batchId, dueDate, note } = (await request.json()) as { batchId?: string; dueDate?: string; note?: string };
    if (!batchId) {
      return NextResponse.json({ error: "batchIdが必要です。" }, { status: 400 });
    }

    await prisma.task.updateMany({
      where: taskGroupWhere(batchId),
      data: { dueDate: dueDate ? new Date(dueDate) : null, note: note?.trim() ?? null, isCompleted: false },
    });

    return NextResponse.json({ message: "締切日を更新しました。" });
  } catch {
    return NextResponse.json({ error: "締切日の更新に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { batchId?: string; batchIds?: string[] };
    const ids = Array.isArray(body.batchIds) && body.batchIds.length > 0
      ? body.batchIds
      : body.batchId
        ? [body.batchId]
        : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });
    }

    await prisma.task.deleteMany({
      where: {
        OR: ids.map((id) => taskGroupWhere(id)),
      },
    });

    return NextResponse.json({ message: "削除しました。", deletedCount: ids.length });
  } catch {
    return NextResponse.json({ error: "課題の削除に失敗しました。" }, { status: 500 });
  }
}
