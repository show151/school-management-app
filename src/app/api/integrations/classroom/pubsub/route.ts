import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ClassroomNotification = {
  collection?: string;
  eventType?: string;
  resourceId?: Record<string, string>;
  registrationId?: string;
};

type PubSubPush = {
  message?: { data?: string; messageId?: string; attributes?: Record<string, string> };
  subscription?: string;
};

function externalId(notification: ClassroomNotification, message: PubSubPush["message"]) {
  const raw = JSON.stringify({ notification, messageId: message?.messageId });
  return `classroom-pubsub-${createHash("sha256").update(raw).digest("hex")}`;
}

export async function POST(request: Request) {
  const configuredSecret = process.env.CLASSROOM_PUBSUB_SECRET;
  if (!configuredSecret) return NextResponse.json({ error: "Pub/Sub連携は現在無効です。" }, { status: 410 });
  if (configuredSecret && request.headers.get("x-classroom-pubsub-secret") !== configuredSecret) {
    return NextResponse.json({ error: "Pub/Sub認証に失敗しました。" }, { status: 401 });
  }

  try {
    const body = await request.json() as PubSubPush;
    if (!body.message?.data) return NextResponse.json({ error: "Pub/Sub message.dataがありません。" }, { status: 400 });

    const notification = JSON.parse(Buffer.from(body.message.data, "base64").toString("utf8")) as ClassroomNotification;
    const externalIdValue = externalId(notification, body.message);
    const existing = await prisma.integrationEvent.findUnique({ where: { provider_externalId: { provider: "classroom", externalId: externalIdValue } } });
    if (existing) return new Response(null, { status: 204 });

    await prisma.integrationEvent.create({
      data: {
        provider: "classroom",
        externalId: externalIdValue,
        eventType: notification.collection || "unknown",
        payload: { notification, subscription: body.subscription || null, attributes: body.message.attributes || null },
        status: "received",
      },
    });

    return NextResponse.json({ accepted: true, externalId: externalIdValue, status: "received" }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pub/Sub通知の受信に失敗しました。" }, { status: 400 });
  }
}
