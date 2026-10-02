import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  const connection = await prisma.teamsConnection.findUnique({ where: { userId }, select: { microsoftEmail: true, status: true, lastSyncedAt: true } });
  return NextResponse.json({ connected: connection?.status === "connected", connection });
}
