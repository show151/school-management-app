import { NextResponse } from "next/server";
import { Resend } from "resend";
import { importExternalEvent, normalizeExternalEvent } from "@/lib/external-integrations";

const resend = new Resend(process.env.RESEND_API_KEY || "");

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function field(body: string, names: string[]) {
  for (const name of names) {
    const match = body.match(new RegExp(`^\\s*${name}\\s*[:：]\\s*(.+)$`, "im"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function recipientEmails(body: string) {
  const value = field(body, ["対象者", "対象者メール", "宛先", "Recipients", "To"]);
  return Array.from(new Set(value.split(/[;,、\s]+/).map((email) => email.trim().toLowerCase()).filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))));
}

function isBroadcastChannel(channelId: string) {
  const configured = process.env.RESEND_INBOUND_BROADCAST_CHANNEL_ID?.trim() || "class-broadcast";
  return channelId.trim().toLowerCase() === configured.toLowerCase();
}

function verifyWebhook(request: Request, rawBody: string) {
  const secret = process.env.RESEND_WEBHOOK_SIGNING_SECRET?.trim();
  if (!secret) return false;

  try {
    resend.webhooks.verify({
      payload: rawBody,
      webhookSecret: secret,
      headers: {
        id: request.headers.get("svix-id") || "",
        timestamp: request.headers.get("svix-timestamp") || "",
        signature: request.headers.get("svix-signature") || "",
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyWebhook(request, rawBody)) {
    return NextResponse.json({ error: "Webhookの署名検証に失敗しました。" }, { status: 401 });
  }

  let notification: { type?: string; data?: { email_id?: string } };
  try {
    notification = JSON.parse(rawBody) as typeof notification;
  } catch {
    return NextResponse.json({ error: "Webhook JSONの解析に失敗しました。" }, { status: 400 });
  }

  if (notification.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const emailId = textValue(notification.data?.email_id);
  if (!emailId) {
    return NextResponse.json({ error: "受信メールIDがありません。" }, { status: 400 });
  }

  try {
    const received = await resend.emails.receiving.get(emailId);
    if (received.error || !received.data) {
      throw new Error(received.error?.message || "受信メールを取得できませんでした。");
    }

    const email = received.data;
    const body = textValue(email.text) || stripHtml(textValue(email.html));
    const title = field(body, ["タイトル", "Title"]) || email.subject || "Teamsからの課題";
    const dueDate = field(body, ["締切", "期限", "Due date", "Due"]) || undefined;
    const url = field(body, ["URL", "リンク", "Link"]) || undefined;
    const description = field(body, ["本文", "内容", "説明", "Description", "Body"]) || body;
    const groupId = field(body, ["チャンネルID", "Channel ID", "グループID", "Group ID"]) || undefined;
    const recipients = recipientEmails(body);
    const broadcast = Boolean(groupId && isBroadcastChannel(groupId));
    if (!broadcast && !groupId && !recipients.length) {
      return NextResponse.json({ error: "チャンネルIDまたは対象者メールが指定されていないため登録しませんでした。" }, { status: 400 });
    }

    const event = normalizeExternalEvent("teams", {
      id: email.message_id || email.id,
      type: "assignment",
      title,
      subject: email.subject || "Teams課題",
      body: description,
      dueDate,
      url,
      groupId: broadcast ? undefined : groupId,
      recipients: recipients.map((email) => ({ email })),
    });
    const result = await importExternalEvent("teams", event);
    return NextResponse.json({ ok: true, message: "メールから課題を登録しました。", ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "メールからの課題登録に失敗しました。" },
      { status: 400 },
    );
  }
}
