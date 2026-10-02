import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncTeamsForUser } from "@/lib/teams";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || supplied !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connections = await prisma.teamsConnection.findMany({ where: { status: { in: ["connected", "error"] } }, select: { userId: true } });
  let synced = 0;
  const errors: string[] = [];
  for (const connection of connections) {
    try { await syncTeamsForUser(connection.userId); synced += 1; }
    catch (error) { errors.push(`${connection.userId}: ${error instanceof Error ? error.message : "unknown"}`); }
  }
  return NextResponse.json({ attempted: connections.length, synced, errors });
}
