import { NextResponse } from "next/server";
import { importExternalEvent, isProvider, normalizeExternalEvent, verifyIntegrationSignature } from "@/lib/external-integrations";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ error: "対応していない連携先です。" }, { status: 404 });
  const validationToken = new URL(request.url).searchParams.get("validationToken");
  return validationToken ? new Response(validationToken, { headers: { "content-type": "text/plain" } }) : NextResponse.json({ ok: true, provider });
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerParam } = await params;
  if (!isProvider(providerParam)) return NextResponse.json({ error: "対応していない連携先です。" }, { status: 404 });
  const rawBody = await request.text();
  if (!verifyIntegrationSignature(request, providerParam, rawBody)) return NextResponse.json({ error: "署名の検証に失敗しました。" }, { status: 401 });
  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const result = await importExternalEvent(providerParam, normalizeExternalEvent(providerParam, payload));
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "外部イベントの取り込みに失敗しました。" }, { status: 400 });
  }
}
