import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { batchId, batchIds, userIds } = (await request.json()) as { batchId?: string; batchIds?: string[]; userIds: string[] };
    const targetBatchIds = batchIds || (batchId ? [batchId] : []);
    
    if (targetBatchIds.length === 0 || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "batchId(s)とユーザーIDが必要です。" }, { status: 400 });
    }

    console.log("Assign API called with targetBatchIds:", targetBatchIds, "userIds:", userIds);
    let totalAssignedCount = 0;

    for (const currentBatchId of targetBatchIds) {
      // 元となる課題を取得
      const templateTask = await prisma.task.findFirst({
        where: { OR: [{ adminBatchId: currentBatchId }, { id: currentBatchId }] },
      });

      if (!templateTask) {
        console.warn(`Template task not found for batchId: ${currentBatchId}`);
        continue;
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

      if (targetUserIds.length > 0) {
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
        totalAssignedCount += targetUserIds.length;
      }
    }

    return NextResponse.json({ message: `合計${totalAssignedCount}件の課題割り当て処理を行いました。` }, { status: 201 });
  } catch (error) {
    console.error("Assign Task Error:", error);
    return NextResponse.json({ error: "課題の割り当てに失敗しました。" }, { status: 500 });
  }
}
