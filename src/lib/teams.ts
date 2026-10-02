import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/classroom";

export const TEAMS_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "EduRoster.ReadBasic",
  "EduAssignments.ReadBasic",
];

type GraphError = { error?: { code?: string; message?: string } };

function microsoftTenant() {
  return process.env.MICROSOFT_TENANT_ID || "organizations";
}

export function getTeamsRedirectUri(request: Request) {
  const requestUrl = new URL(request.url);
  if (["localhost", "127.0.0.1"].includes(requestUrl.hostname)) {
    return process.env.MICROSOFT_REDIRECT_URI_LOCAL || `${requestUrl.origin}/api/integrations/teams/callback`;
  }
  if (!process.env.MICROSOFT_REDIRECT_URI) throw new Error("本番用MICROSOFT_REDIRECT_URIが未設定です。");
  return process.env.MICROSOFT_REDIRECT_URI;
}

export function getTeamsAuthorizeUrl(params: Record<string, string>) {
  return `https://login.microsoftonline.com/${encodeURIComponent(microsoftTenant())}/oauth2/v2.0/authorize?${new URLSearchParams(params).toString()}`;
}

async function exchangeMicrosoftToken(body: Record<string, string>) {
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(microsoftTenant())}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
      ...body,
    }),
  });
  const data = await response.json() as { access_token?: string; refresh_token?: string; scope?: string; error?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || "Microsoftアクセストークンの取得に失敗しました。");
  return data;
}

export function exchangeMicrosoftAuthorizationCode(code: string, redirectUri: string) {
  return exchangeMicrosoftToken({ code, redirect_uri: redirectUri, grant_type: "authorization_code", scope: TEAMS_SCOPES.join(" ") });
}

export async function exchangeMicrosoftRefreshToken(refreshToken: string) {
  return exchangeMicrosoftToken({ refresh_token: refreshToken, grant_type: "refresh_token", scope: TEAMS_SCOPES.join(" ") });
}

async function graphGet<T>(accessToken: string, pathOrUrl: string) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `https://graph.microsoft.com/v1.0${pathOrUrl}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const data = await response.json() as T & GraphError;
  if (!response.ok) throw new Error(data.error?.message || `Microsoft Graph error: ${response.status}`);
  return data;
}

async function graphListAll<T>(accessToken: string, path: string) {
  const items: T[] = [];
  let nextUrl: string | undefined = path;
  while (nextUrl) {
    const data: { value?: T[]; [key: string]: unknown } = await graphGet<{ value?: T[]; [key: string]: unknown }>(accessToken, nextUrl);
    if (Array.isArray(data.value)) items.push(...data.value);
    nextUrl = typeof data["@odata.nextLink"] === "string" ? data["@odata.nextLink"] : undefined;
  }
  return items;
}

function normalizeSubjectName(value: string) {
  return value.toLocaleLowerCase("ja-JP").replace(/[\s　・･、。，．()（）\[\]【】「」『』]/g, "");
}

function matchesSubject(className: string, subjectNames: string[]) {
  const normalizedClassName = normalizeSubjectName(className);
  if (!normalizedClassName) return false;
  return subjectNames.some((subject) => {
    const normalized = normalizeSubjectName(subject);
    return normalized.length >= 2 && (normalizedClassName.includes(normalized) || normalized.includes(normalizedClassName));
  });
}

type TeamsClass = { id: string; displayName?: string; description?: string };
type TeamsAssignment = { id: string; displayName?: string; instructions?: { content?: string }; dueDateTime?: string; webUrl?: string; status?: string };

export async function syncTeamsForUser(userId: string) {
  const connection = await prisma.teamsConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Microsoft Teamsが連携されていません。");
  try {
    const tokenData = await exchangeMicrosoftRefreshToken(decryptSecret(connection.encryptedRefreshToken));
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("Microsoftアクセストークンを取得できませんでした。");
    const lessons = await prisma.lesson.findMany({ select: { subject: true } });
    const subjectNames = Array.from(new Set(lessons.map((lesson) => lesson.subject)));
    if (subjectNames.length === 0) throw new Error("時間割に登録された教科がありません。");

    const classes = await graphListAll<TeamsClass>(accessToken, "/education/me/classes?$top=100");
    const matchedClasses = classes.filter((item) => matchesSubject([item.displayName, item.description].filter(Boolean).join(" "), subjectNames));
    const assignments: Array<TeamsAssignment & { classId: string; className: string }> = [];
    for (const educationClass of matchedClasses) {
      const classAssignments = await graphListAll<TeamsAssignment>(accessToken, `/education/classes/${encodeURIComponent(educationClass.id)}/assignments?$filter=${encodeURIComponent("status eq 'assigned'")}&$top=100`);
      assignments.push(...classAssignments.map((assignment) => ({ ...assignment, classId: educationClass.id, className: educationClass.displayName || educationClass.id })));
    }

    const syncedTaskIds: string[] = [];
    for (const assignment of assignments) {
      syncedTaskIds.push(assignment.id);
      await prisma.task.upsert({
        where: { sourceProvider_sourceGroupId_sourceExternalId_userId: { sourceProvider: "teams", sourceGroupId: assignment.classId, sourceExternalId: assignment.id, userId } },
        create: {
          userId,
          subject: assignment.className,
          title: assignment.displayName || "Teamsの課題",
          dueDate: assignment.dueDateTime ? new Date(assignment.dueDateTime) : null,
          note: [assignment.instructions?.content, assignment.webUrl].filter(Boolean).join("\n"),
          sourceProvider: "teams",
          sourceGroupId: assignment.classId,
          sourceExternalId: assignment.id,
          sourceUrl: assignment.webUrl,
          isCompleted: false,
          isVisible: true,
        },
        update: {
          subject: assignment.className,
          title: assignment.displayName || "Teamsの課題",
          dueDate: assignment.dueDateTime ? new Date(assignment.dueDateTime) : null,
          note: [assignment.instructions?.content, assignment.webUrl].filter(Boolean).join("\n"),
          sourceUrl: assignment.webUrl,
          isVisible: true,
        },
      });
    }

    await prisma.task.updateMany({ where: { userId, sourceProvider: "teams", ...(syncedTaskIds.length ? { sourceExternalId: { notIn: syncedTaskIds } } : {}) }, data: { isVisible: false } });
    await prisma.teamsConnection.update({ where: { id: connection.id }, data: { status: "connected", lastSyncedAt: new Date(), lastError: null, ...(tokenData.refresh_token ? { encryptedRefreshToken: encryptSecret(tokenData.refresh_token) } : {}) } });
    return { classes: matchedClasses.length, candidates: classes.length, assignments: assignments.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teams同期に失敗しました。";
    await prisma.teamsConnection.update({ where: { id: connection.id }, data: { status: message.includes("invalid_grant") ? "expired" : "error", lastError: message } });
    throw error;
  }
}
