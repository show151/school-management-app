import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
    }

    return NextResponse.json({ error: "ユーザーの削除に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const studentNumberValue = body?.studentNumber;
    const studentNumber = studentNumberValue === "" || studentNumberValue === null || typeof studentNumberValue === "undefined"
      ? null
      : Number(studentNumberValue);

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (studentNumber !== null && (!Number.isInteger(studentNumber) || studentNumber < 1)) {
      return NextResponse.json({ error: "studentNumber must be a positive integer" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { studentNumber },
      select: {
        id: true,
        studentNumber: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "この出席番号はすでに使われています。" }, { status: 409 });
    }

    return NextResponse.json({ error: "ユーザー情報の更新に失敗しました。" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    // Return empty list during build/data-collection to avoid failing the build.
    return NextResponse.json([]);
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
  } catch {
    return NextResponse.json({ error: "ユーザー情報の取得に失敗しました。" }, { status: 500 });
  }
}
