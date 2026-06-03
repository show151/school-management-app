import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { batchId, userIds } = (await request.json()) as { batchId: string; userIds: string[] };
    if (!batchId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "batchIdとユーザーIDが必要です。" }, { status: 400 });
    }

    // 元となる課題を取得
    console.log("Assign API called with batchId:", batchId, "userIds:", userIds);
    const templateTask = await prisma.task.findFirst({
      where: { OR: [{ adminBatchId: batchId }, { id: batchId }] },
    });
    console.log("templateTask found:", templateTask ? "YES" : "NO");

    if (!templateTask) {
      return NextResponse.json({ error: `対象の課題が見つかりません。batchId: ${batchId}` }, { status: 404 });
    }

    // 指定されたユーザーのうち、まだこの課題（adminBatchIdベース）を持っていない人を特定
    const existingTasks = await prisma.task.findMany({
      where: {
        userId: { in: userIds },
        adminBatchId: templateTask.adminBatchId ?? templateTask.id,
      },
      select: { userId: true },
    });
    
    const existingUserIds = new Set(existingTasks.map(t => t.userId));
    const targetUserIds = userIds.filter(id => !existingUserIds.has(id));

    if (targetUserIds.length === 0) {
      return NextResponse.json({ message: "すべてのユーザーに既に割り当てられています。" }, { status: 200 });
    }

    // 足りないユーザーに新しい課題レコードを作成
    await prisma.task.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        adminBatchId: templateTask.adminBatchId ?? templateTask.id,
        subject: templateTask.subject,
        title: templateTask.title,
        dueDate: templateTask.dueDate,
        note: templateTask.note,
        isCompleted: false,
      })),
    });

    return NextResponse.json({ message: `${targetUserIds.length}人に課題を割り当てました。` }, { status: 201 });
  } catch (error) {
    console.error("Assign Task Error:", error);
    return NextResponse.json({ error: "課題の割り当てに失敗しました。" }, { status: 500 });
  }
}
