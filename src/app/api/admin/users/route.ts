import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

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
