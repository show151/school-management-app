import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/user-auth";
import { syncClassroomForUser } from "@/lib/classroom";
import { checkRateLimitWithRedisFallback } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  if (!(await checkRateLimitWithRedisFallback(`classroom-sync:${userId}`, 2, 10 * 60 * 1000))) return NextResponse.json({ error: "同期の実行回数が多すぎます。10分ほど待ってから再試行してください。" }, { status: 429 });
  try { return NextResponse.json({ ok: true, ...(await syncClassroomForUser(userId)) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "同期に失敗しました。" }, { status: 400 }); }
}
