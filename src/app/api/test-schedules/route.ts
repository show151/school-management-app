import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { getRequiredEnv } from "@/lib/env";
import { sortTestEntries } from "@/lib/test-schedule";

const JWT_SECRET = getRequiredEnv("JWT_SECRET");

async function getUserId(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader.split("; ").find((r) => r.startsWith("auth_token="))?.split("=")[1];
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return (payload as { userId?: string }).userId ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("id");

    if (scheduleId) {
      const schedule = await prisma.testSchedule.findUnique({
        where: { id: scheduleId },
        include: { entries: true },
      });
      if (!schedule) {
        return NextResponse.json({ error: "スケジュールが見つかりません。" }, { status: 404 });
      }
      const entries = sortTestEntries(schedule.entries);
      return NextResponse.json({
        id: schedule.id,
        title: schedule.title,
        startDate: schedule.startDate.toISOString(),
        endDate: schedule.endDate.toISOString(),
        entries: entries.map((e) => ({
          id: e.id,
          dayOfWeek: e.dayOfWeek,
          period: e.period,
          subject: e.subject,
          note: e.note,
        })),
      });
    }

    const now = new Date();
    const schedules = await prisma.testSchedule.findMany({
      where: { endDate: { gte: now } },
      include: { entries: true },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(
      schedules.map((s) => ({
        id: s.id,
        title: s.title,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        entryCount: s.entries.length,
      }))
    );
  } catch (error) {
    console.error("GET /api/test-schedules error:", error);
    return NextResponse.json({ error: "取得に失敗しました。" }, { status: 500 });
  }
}
