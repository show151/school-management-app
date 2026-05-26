import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subjects);
}

export async function POST(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { name } = (await request.json()) as { name?: string };
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return NextResponse.json({ error: "教科名を入力してください。" }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: { name: trimmedName },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch {
    return NextResponse.json({ error: "教科の登録に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });

    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ message: "削除しました。" });
  } catch {
    return NextResponse.json({ error: "教科の削除に失敗しました。" }, { status: 500 });
  }
}
