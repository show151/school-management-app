import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { importExternalEvent, normalizeExternalEvent } from "@/lib/external-integrations";

function hasValidToken(request: Request) {
  const expected = process.env.INTEGRATION_TEAMS_FLOW_TOKEN?.trim();
  const supplied = request.headers.get("x-integration-token")?.trim();
  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "JSONオブジェクトが必要です。" }, { status: 400 });
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSONの解析に失敗しました。" }, { status: 400 });
  }

  if (payload.type !== "assignment") {
    return NextResponse.json({ error: "type は assignment である必要があります。" }, { status: 400 });
  }

  try {
    const event = normalizeExternalEvent("teams", payload);
    const result = await importExternalEvent("teams", event);
    return NextResponse.json({ ok: true, message: "課題を登録しました。", ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "課題の登録に失敗しました。" },
      { status: 400 },
    );
  }
}
