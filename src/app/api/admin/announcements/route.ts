import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      // During build/data-collection Next may call this route without cookies.
      // Return an empty array (200) instead of 401 so static data collection
      // doesn't fail. The admin UI will still redirect to login on client-side
      // when it receives no announcements or a non-ok response.
      return NextResponse.json([]);
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('GET /api/admin/announcements error:', error);
    return NextResponse.json({ error: 'お知らせ一覧の取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
    }

    const { title, body, date, announcementType } = (await request.json()) as {
      title?: string;
      body?: string;
      date?: string;
      announcementType?: string;
    };

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "件名と本文を入力してください。" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        date: date ? new Date(date) : new Date(),
        announcementType: announcementType ?? "announcement",
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/announcements error:', error);
    return NextResponse.json({ error: "連絡の登録に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
    }

    const { id, title, body, date, announcementType } = (await request.json()) as {
      id?: string;
      title?: string;
      body?: string;
      date?: string;
      announcementType?: string;
    };

    if (!id || !title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "ID・件名・本文を入力してください。" }, { status: 400 });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title: title.trim(),
        body: body.trim(),
        date: date ? new Date(date) : undefined,
        announcementType: announcementType ?? undefined,
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('PATCH /api/admin/announcements error:', error);
    return NextResponse.json({ error: "連絡の更新に失敗しました。" }, { status: 500 });
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

    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ message: "削除しました。" });
  } catch (error) {
    console.error('DELETE /api/admin/announcements error:', error);
    return NextResponse.json({ error: "連絡の削除に失敗しました。" }, { status: 500 });
  }
}
