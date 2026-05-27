import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        studentNumber: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: { studentNumber: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "ユーザー情報の取得に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, studentNumber, name } = body as { id?: string; studentNumber?: number | null; name?: string };
    if (!id) {
      return NextResponse.json({ error: 'ユーザーIDが必要です。' }, { status: 400 });
    }

    const data: any = {};
    if (typeof studentNumber !== 'undefined') data.studentNumber = studentNumber === null ? null : Number(studentNumber);
    if (typeof name === 'string') data.name = name.trim();

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, studentNumber: true, name: true, email: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update user:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'ユーザーの更新に失敗しました。', details: message }, { status: 500 });
  }
}
