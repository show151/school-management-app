import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
    }

    const lessons = await prisma.lesson.findMany({ orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }] });
    return NextResponse.json(lessons);
  } catch (error) {
    console.error('GET /api/admin/lessons error:', error);
    return NextResponse.json({ error: '時間割一覧の取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });

    const body = (await request.json()) as { dayOfWeek?: string; period?: number; subject?: string; userId?: string };
    const { dayOfWeek, period, subject, userId } = body;
    if (!dayOfWeek || !period || !subject) {
      return NextResponse.json({ error: "必須フィールドが不足しています。" }, { status: 400 });
    }

    const lesson = await prisma.lesson.create({
      data: { dayOfWeek, period, subject },
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (err) {
    console.error('Create lesson error:', err);
    return NextResponse.json({ error: '時間割の登録に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
    }

    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });

    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ message: "削除しました。" });
  } catch (error) {
    console.error('DELETE /api/admin/lessons error:', error);
    return NextResponse.json({ error: '時間割の削除に失敗しました。' }, { status: 500 });
  }
}
