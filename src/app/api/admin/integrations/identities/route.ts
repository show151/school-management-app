import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  return NextResponse.json(await prisma.integrationIdentity.findMany({ include: { user: { select: { id: true, name: true, email: true } } }, orderBy: [{ provider: "asc" }, { email: "asc" }] }));
}

export async function POST(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  const body = await request.json() as { provider?: string; externalUserId?: string; email?: string; userId?: string };
  if (!body.provider || !body.externalUserId || !body.userId) return NextResponse.json({ error: "provider、externalUserId、userIdが必要です。" }, { status: 400 });
  const identity = await prisma.integrationIdentity.upsert({
    where: { provider_externalUserId: { provider: body.provider, externalUserId: body.externalUserId } },
    create: { provider: body.provider, externalUserId: body.externalUserId, email: body.email?.trim().toLowerCase() || null, userId: body.userId },
    update: { email: body.email?.trim().toLowerCase() || null, userId: body.userId },
  });
  return NextResponse.json(identity, { status: 201 });
}
