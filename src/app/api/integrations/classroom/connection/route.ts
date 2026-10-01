import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/user-auth";
import { decryptSecret, exchangeRefreshToken } from "@/lib/classroom";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  const connection = await prisma.classroomConnection.findUnique({ where: { userId } });
  if (!connection) return NextResponse.json({ ok: true });
  try { const accessToken = await exchangeRefreshToken(decryptSecret(connection.encryptedRefreshToken)); await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, { method: "POST" }); } catch { /* revoke失敗でもローカル解除は続行 */ }
  await prisma.classroomConnection.update({ where: { userId }, data: { status: "revoked", encryptedRefreshToken: "revoked", lastError: null } });
  return NextResponse.json({ ok: true });
}
