import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });

  const lessons = await prisma.lesson.findMany({ orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }] });
  return NextResponse.json(lessons);
}

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });

  try {
    const body = (await request.json()) as { dayOfWeek?: string; period?: number; subject?: string; userId?: string };
    const { dayOfWeek, period, subject, userId } = body;
    if (!dayOfWeek || !period || !subject) {
      return NextResponse.json({ error: "必須フィールドが不足しています。" }, { status: 400 });
    }

    const data: any = { dayOfWeek, period, subject };
    if (userId) data.userId = userId;

    const lesson = await prisma.lesson.create({ data });
    return NextResponse.json(lesson, { status: 201 });
  } catch (err) {
    console.error('Create lesson error:', err);
    return NextResponse.json({ error: '時間割の登録に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });

  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: 'IDが必要です。' }, { status: 400 });
    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ message: '削除しました。' });
  } catch (err) {
    console.error('Delete lesson error:', err);
    return NextResponse.json({ error: '時間割の削除に失敗しました。' }, { status: 500 });
  }
}
