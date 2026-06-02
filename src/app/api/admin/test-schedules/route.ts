import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sortTestEntries } from "@/lib/test-schedule";

function serializeSchedule(
  schedule: {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    entries: { id: string; dayOfWeek: string; period: number; subject: string; note: string | null }[];
  }
) {
  return {
    id: schedule.id,
    title: schedule.title,
    startDate: schedule.startDate.toISOString(),
    endDate: schedule.endDate.toISOString(),
    createdAt: schedule.createdAt.toISOString(),
    entries: sortTestEntries(schedule.entries).map((e) => ({
      id: e.id,
      dayOfWeek: e.dayOfWeek,
      period: e.period,
      subject: e.subject,
      note: e.note,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) return NextResponse.json([]);

    const schedules = await prisma.testSchedule.findMany({
      include: { entries: true },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(schedules.map(serializeSchedule));
  } catch (error) {
    console.error("GET /api/admin/test-schedules error:", error);
    return NextResponse.json({ error: "テストスケジュールの取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { title, startDate, endDate } = (await request.json()) as {
      title?: string;
      startDate?: string;
      endDate?: string;
    };

    if (!title?.trim() || !startDate || !endDate) {
      return NextResponse.json(
        { error: "タイトル、開始日、終了日を入力してください。" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return NextResponse.json({ error: "終了日は開始日以降にしてください。" }, { status: 400 });
    }

    const schedule = await prisma.testSchedule.create({
      data: {
        title: title.trim(),
        startDate: start,
        endDate: end,
      },
      include: { entries: true },
    });

    return NextResponse.json(serializeSchedule(schedule), { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/test-schedules error:", error);
    return NextResponse.json({ error: "テストスケジュールの登録に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { scheduleId } = (await request.json()) as { scheduleId?: string };
    if (!scheduleId) return NextResponse.json({ error: "scheduleId が必要です。" }, { status: 400 });

    await prisma.testSchedule.delete({ where: { id: scheduleId } });
    return NextResponse.json({ message: "削除しました。" });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }
}
