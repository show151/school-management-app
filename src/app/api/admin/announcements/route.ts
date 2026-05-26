import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(announcements);
}

export async function POST(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { title, body, date } = (await request.json()) as {
      title?: string;
      body?: string;
      date?: string;
    };

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "件名と本文を入力してください。" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "連絡の登録に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });

    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ message: "削除しました。" });
  } catch {
    return NextResponse.json({ error: "連絡の削除に失敗しました。" }, { status: 500 });
  }
}
