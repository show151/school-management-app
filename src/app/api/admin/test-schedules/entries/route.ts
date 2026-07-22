import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { TEST_DAYS, TEST_PERIODS } from "@/lib/test-schedule";

function isValidDay(day: string) {
  // 漢字形式（レガシー）
  if ((TEST_DAYS as readonly string[]).includes(day)) return true;
  // 日付文字列形式（新形式: "YYYY-M-D"）
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(day)) return true;
  return false;
}

function isValidPeriod(period: number) {
  return (TEST_PERIODS as readonly number[]).includes(period);
}

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { scheduleId, dayOfWeek, period, subject, note } = (await request.json()) as {
      scheduleId?: string;
      dayOfWeek?: string;
      period?: number;
      subject?: string;
      note?: string;
    };

    if (!scheduleId || !dayOfWeek || !period || !subject?.trim()) {
      return NextResponse.json({ error: "必須項目が不足しています。" }, { status: 400 });
    }

    if (!isValidDay(dayOfWeek) || !isValidPeriod(period)) {
      return NextResponse.json({ error: "曜日または時限が不正です。" }, { status: 400 });
    }

    const schedule = await prisma.testSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      return NextResponse.json({ error: "スケジュールが見つかりません。" }, { status: 404 });
    }

    const trimmedSubject = subject.trim();
    const duplicate = await prisma.testScheduleEntry.findFirst({
      where: { scheduleId, dayOfWeek, period, subject: trimmedSubject },
    });
    if (duplicate) {
      return NextResponse.json({ error: "同じセルに同じ教科が既に登録されています。" }, { status: 400 });
    }

    const entry = await prisma.testScheduleEntry.create({
      data: {
        scheduleId,
        dayOfWeek,
        period,
        subject: trimmedSubject,
        note: note?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        period: entry.period,
        subject: entry.subject,
        note: entry.note,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST test-schedules/entries error:", error);
    return NextResponse.json({ error: "登録に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { entryId, note } = (await request.json()) as { entryId?: string; note?: string };

    if (!entryId) {
      return NextResponse.json({ error: "entryId が必要です。" }, { status: 400 });
    }

    const entry = await prisma.testScheduleEntry.update({
      where: { id: entryId },
      data: { note: note?.trim() || null },
    });

    return NextResponse.json({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
      subject: entry.subject,
      note: entry.note,
    });
  } catch {
    return NextResponse.json({ error: "更新に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { entryId } = (await request.json()) as { entryId?: string };
    if (!entryId) return NextResponse.json({ error: "entryId が必要です。" }, { status: 400 });

    await prisma.testScheduleEntry.delete({ where: { id: entryId } });
    return NextResponse.json({ message: "削除しました。" });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }
}
