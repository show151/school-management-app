import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type AdminTestSummary = {
  batchId: string;
  subject: string;
  period: number;
  range: string;
  note: string | null;
  testDate: Date;
  assignedCount: number;
};

type TestRow = Awaited<ReturnType<typeof prisma.test.findMany>>[number];

export async function GET(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      return NextResponse.json([]);
    }

    const tests = await prisma.test.findMany({
      orderBy: { testDate: "asc" },
    });

    const summaries = Array.from(
      tests
        .reduce((map: Map<string, AdminTestSummary>, test: TestRow) => {
          const batchId = test.adminBatchId || test.id;
          const current =
            map.get(batchId) ||
            ({
              batchId,
              subject: test.subject,
              period: test.period,
              range: test.range,
              note: test.note,
              testDate: test.testDate,
              assignedCount: 0,
            } satisfies AdminTestSummary);

          current.assignedCount += 1;
          map.set(batchId, current);
          return map;
        }, new Map<string, AdminTestSummary>())
        .values()
    );

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("GET /api/admin/tests error:", error);
    return NextResponse.json({ error: "テスト一覧の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { subject, period, range, testDate, note } = (await request.json()) as {
      subject?: string;
      period?: number;
      range?: string;
      testDate?: string;
      note?: string;
    };

    if (!subject?.trim() || !period || !range?.trim() || !testDate) {
      return NextResponse.json(
        { error: "教科、時限、範囲、テスト日時を入力してください。" },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      select: { id: true },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: "テストを配布するユーザーがまだ登録されていません。" },
        { status: 400 }
      );
    }

    const testDateObj = new Date(testDate);
    const adminBatchId = randomUUID();
    const trimmedNote = note?.trim() || null;

    await prisma.test.createMany({
      data: users.map((user: { id: string }) => ({
        userId: user.id,
        adminBatchId,
        subject: subject.trim(),
        period,
        range: range.trim(),
        note: trimmedNote,
        testDate: testDateObj,
      })),
    });

    return NextResponse.json(
      {
        message: "テスト情報を登録しました。",
        adminBatchId,
        subject,
        testDate: testDateObj,
        assignedCount: users.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Test creation error:", error);
    return NextResponse.json({ error: "テスト情報の登録に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { batchId, id } = (await request.json()) as { batchId?: string; id?: string };
    const targetId = batchId || id;
    if (!targetId) return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });

    await prisma.test.deleteMany({
      where: {
        OR: [{ adminBatchId: targetId }, { id: targetId }],
      },
    });

    return NextResponse.json({ message: "テスト情報を削除しました。" });
  } catch {
    return NextResponse.json({ error: "テスト情報の削除に失敗しました。" }, { status: 500 });
  }
}
