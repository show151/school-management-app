import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  await prisma.teamsConnection.updateMany({ where: { userId }, data: { status: "revoked", encryptedRefreshToken: "revoked", lastError: null } });
  return NextResponse.json({ ok: true });
}
