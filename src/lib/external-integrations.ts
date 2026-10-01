import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export type IntegrationProvider = "teams" | "classroom" | "moodle";
export type ExternalEvent = {
  id: string;
  type: "message" | "assignment";
  title: string;
  body: string;
  url?: string;
  subject?: string;
  dueDate?: string;
  groupId?: string;
  recipients?: Array<{ externalUserId?: string; email?: string }>;
};

const providerNames: Record<IntegrationProvider, string> = {
  teams: "Microsoft Teams",
  classroom: "Google Classroom",
  moodle: "Moodle",
};

export function isProvider(value: string): value is IntegrationProvider {
  return value === "teams" || value === "classroom" || value === "moodle";
}

export function verifyIntegrationSignature(request: Request, provider: IntegrationProvider, rawBody: string) {
  const secret = process.env[`INTEGRATION_${provider.toUpperCase()}_SECRET`];
  if (!secret) return true;
  const supplied = request.headers.get("x-integration-signature") || request.headers.get("x-hub-signature-256");
  if (!supplied) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const normalized = supplied.replace(/^sha256=/, "");
  return normalized.length === expected.length && timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeExternalEvent(provider: IntegrationProvider, payload: Record<string, unknown>): ExternalEvent {
  let decodedData: unknown = payload.data;
  if (typeof decodedData === "string") {
    try { decodedData = JSON.parse(Buffer.from(decodedData, "base64").toString("utf8")); } catch { /* plain text provider payload */ }
  }
  const source = (decodedData && typeof decodedData === "object" ? decodedData : payload) as Record<string, unknown>;
  const resource = (source.resourceData && typeof source.resourceData === "object" ? source.resourceData : source) as Record<string, unknown>;
  const id = stringValue(resource.id || source.id || source.eventId || source.messageId || source.assignmentId || source.resourceName);
  const typeValue = stringValue(source.type || source.eventType || source.kind || source.resourceType || source.changeType || resource.type).toLowerCase();
  const type = typeValue.includes("assignment") || typeValue.includes("coursework") || typeValue.includes("task") ? "assignment" : "message";
  const title = stringValue(resource.title || source.title || source.name || source.subject || source.summary) || `${providerNames[provider]}からの連絡`;
  const body = stringValue(resource.body || resource.bodyPreview || source.body || source.description || source.text || source.content || source.message) || title;
  const url = stringValue(resource.url || source.url || source.link || source.webUrl || source.alternateLink) || undefined;
  const subject = stringValue(resource.subject || source.subject || source.course || source.courseName) || providerNames[provider];
  const dueDate = stringValue(resource.dueDate || source.dueDate || source.due || source.dueTime) || undefined;
  const course = source.course && typeof source.course === "object" ? source.course as Record<string, unknown> : {};
  const groupId = stringValue(resource.groupId || source.groupId || source.channelId || source.courseId || course.id) || undefined;
  const recipientSource = resource.recipients || resource.members || source.recipients || source.members || source.audience;
  const recipients = Array.isArray(recipientSource)
    ? recipientSource.map((item) => {
        const value = (item && typeof item === "object" ? item : { email: item }) as Record<string, unknown>;
        return { externalUserId: stringValue(value.externalUserId || value.userId || value.id) || undefined, email: stringValue(value.email || value.mail || value.userPrincipalName) || undefined };
      }).filter((item) => item.externalUserId || item.email)
    : undefined;
  if (!id) throw new Error("外部イベントIDがありません。");
  return { id, type, title, body, url, subject, dueDate, groupId, recipients };
}

async function resolveTargetUsers(provider: IntegrationProvider, recipients?: ExternalEvent["recipients"], groupId?: string) {
  if (groupId && !recipients?.length) {
    return prisma.integrationIdentity.findMany({ where: { provider, externalGroupId: groupId }, select: { userId: true } }).then((rows) => Array.from(new Map(rows.map((row) => [row.userId, { id: row.userId }])).values()));
  }
  if (!recipients?.length) return prisma.user.findMany({ select: { id: true } });
  const identities = await prisma.integrationIdentity.findMany({ where: { provider }, select: { externalUserId: true, email: true, userId: true } });
  const emails = new Set(recipients.map((recipient) => recipient.email?.toLowerCase()).filter(Boolean));
  const ids = new Set(recipients.map((recipient) => recipient.externalUserId).filter(Boolean));
  const matched = identities.filter((identity) => ids.has(identity.externalUserId) || (identity.email && emails.has(identity.email.toLowerCase())));
  return Array.from(new Map(matched.map((identity) => [identity.userId, { id: identity.userId }])).values());
}

export async function importExternalEvent(provider: IntegrationProvider, event: ExternalEvent) {
  const alreadyImported = await prisma.integrationEvent.findUnique({ where: { provider_externalId: { provider, externalId: event.id } } });
  if (alreadyImported) return { duplicate: true, imported: false };

  if (event.type === "message") {
    await prisma.announcement.create({
      data: { title: event.title, body: event.body, sourceProvider: provider, sourceExternalId: event.id, sourceUrl: event.url },
    });
    await prisma.integrationEvent.create({ data: { provider, externalId: event.id, eventType: event.type } });
    return { duplicate: false, imported: true, kind: "announcement" as const };
  }

  const users = await resolveTargetUsers(provider, event.recipients, event.groupId);
  if (!users.length) return { duplicate: false, imported: false, reason: "ユーザーが未登録です。" };
  const dueDate = event.dueDate && !Number.isNaN(new Date(event.dueDate).getTime()) ? new Date(event.dueDate) : new Date(Date.now() + 7 * 86400000);
  await prisma.task.createMany({
    data: users.map((user) => ({ userId: user.id, adminBatchId: event.id, subject: event.subject || providerNames[provider], title: event.title, dueDate, note: [event.body, event.url].filter(Boolean).join("\n"), sourceProvider: provider, sourceExternalId: event.id, sourceUrl: event.url, isCompleted: false })),
    skipDuplicates: true,
  });
  await prisma.integrationEvent.create({ data: { provider, externalId: event.id, eventType: event.type } });
  return { duplicate: false, imported: true, kind: "task" as const, assignedCount: users.length };
}
