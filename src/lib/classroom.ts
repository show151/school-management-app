import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const CLASSROOM_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.profile.emails",
];

export function getClassroomRedirectUri(request: Request) {
  const requestUrl = new URL(request.url);
  if (["localhost", "127.0.0.1"].includes(requestUrl.hostname)) {
    return process.env.GOOGLE_REDIRECT_URI_LOCAL || `${requestUrl.origin}/api/integrations/classroom/callback`;
  }
  if (!process.env.GOOGLE_REDIRECT_URI) throw new Error("本番用GOOGLE_REDIRECT_URIが未設定です。");
  return process.env.GOOGLE_REDIRECT_URI;
}

type ClassroomCourseWork = { id: string; title?: string; description?: string; alternateLink?: string; dueDate?: { year?: number; month?: number; day?: number }; dueTime?: { hours?: number; minutes?: number; seconds?: number }; state?: string; workType?: string };
type ClassroomAnnouncement = { id: string; text?: string; creatorUserId?: string; alternateLink?: string; creationTime?: string };
type ClassroomStudentSubmission = { courseWorkId?: string; state?: string };

function isClassroomSubmissionComplete(state?: string) {
  return state === "TURNED_IN" || state === "RETURNED" || state === "STUDENT_EDITED_AFTER_TURN_IN";
}

function encryptionKey() {
  const value = process.env.APP_ENCRYPTION_KEY;
  if (!value) throw new Error("APP_ENCRYPTION_KEYが未設定です。");
  const key = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEYは32バイトのhexまたはbase64で指定してください。");
  return key;
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  const [, ivText, tagText, encryptedText] = value.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}

export async function exchangeRefreshToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "", refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error || "Googleアクセストークンの更新に失敗しました。");
  return data.access_token;
}

export async function classroomGet<T>(accessToken: string, path: string) {
  const response = await fetch(`https://classroom.googleapis.com/v1/${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `Classroom API error: ${response.status}`);
  return data;
}

async function classroomListAll<T extends Record<string, unknown>>(accessToken: string, path: string, collection: keyof T) {
  const items: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const data = await classroomGet<T & { nextPageToken?: string }>(accessToken, `${path}${pageToken ? `${separator}pageToken=${encodeURIComponent(pageToken)}` : ""}`);
    const pageItems = data[collection];
    if (Array.isArray(pageItems)) items.push(...pageItems);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

export function oauthStateHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeSubjectName(value: string) {
  return value.toLocaleLowerCase("ja-JP").replace(/[\s　・･、。，．()（）\[\]【】「」『』]/g, "");
}

function courseMatchesSubject(course: { name?: string; section?: string; descriptionHeading?: string }, subjectNames: string[]) {
  const courseText = normalizeSubjectName([course.name, course.section, course.descriptionHeading].filter(Boolean).join(" "));
  return subjectNames.some((subject) => {
    const normalized = normalizeSubjectName(subject);
    return normalized.length >= 2 && (courseText.includes(normalized) || normalized.includes(courseText));
  });
}

export async function syncClassroomForUser(userId: string) {
  const connection = await prisma.classroomConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Google Classroomが連携されていません。");
  try {
    const accessToken = await exchangeRefreshToken(decryptSecret(connection.encryptedRefreshToken));
    const courses = await classroomListAll<{ courses?: Array<{ id: string; name?: string; section?: string; descriptionHeading?: string; courseState?: string }> }>(accessToken, "courses?courseStates=ACTIVE&pageSize=100", "courses") as Array<{ id: string; name?: string; section?: string; descriptionHeading?: string; courseState?: string }>;
    const userLessons = await prisma.lesson.findMany({ select: { subject: true } });
    const subjectNames = Array.from(new Set(userLessons.map((item) => item.subject)));
    if (subjectNames.length === 0) throw new Error("時間割に登録された教科がありません。");
    const matchedCourses = courses.filter((course) => courseMatchesSubject(course, subjectNames));
    const syncedCourseIds: string[] = [];
    const syncedTaskIds: string[] = [];
    for (const course of matchedCourses) {
      syncedCourseIds.push(course.id);
      const savedCourse = await prisma.classroomCourse.upsert({ where: { connectionId_courseId: { connectionId: connection.id, courseId: course.id } }, create: { connectionId: connection.id, courseId: course.id, name: course.name || course.id, section: course.section || null, description: course.descriptionHeading || null, courseState: course.courseState || "ACTIVE" }, update: { name: course.name || course.id, section: course.section || null, description: course.descriptionHeading || null, courseState: course.courseState || "ACTIVE", isActive: true } });
      const courseWork = await classroomListAll<{ courseWork?: ClassroomCourseWork[] }>(accessToken, `courses/${encodeURIComponent(course.id)}/courseWork?courseWorkStates=PUBLISHED&pageSize=100`, "courseWork") as ClassroomCourseWork[];
      const studentSubmissions = await classroomListAll<{ studentSubmissions?: ClassroomStudentSubmission[] }>(accessToken, `courses/${encodeURIComponent(course.id)}/courseWork/-/studentSubmissions?userId=me&pageSize=100`, "studentSubmissions") as ClassroomStudentSubmission[];
      const submissionsByCourseWorkId = new Map(studentSubmissions.map((submission) => [submission.courseWorkId, submission]));
      for (const work of courseWork) {
        const submission = submissionsByCourseWorkId.get(work.id);
        if (!submission) continue;
        const isVisible = !isClassroomSubmissionComplete(submission.state);
        syncedTaskIds.push(work.id);
        const dueDate = work.dueDate
          ? (() => {
              const year = work.dueDate?.year || new Date().getUTCFullYear();
              const month = (work.dueDate?.month || 1) - 1;
              const day = work.dueDate?.day || 1;
              if (work.dueTime) {
                // ClassroomのdueTimeはUTC。画面表示時に日本時間へ変換される。
                return new Date(Date.UTC(year, month, day, work.dueTime.hours || 0, work.dueTime.minutes || 0, work.dueTime.seconds || 0));
              }
              // 時刻なしは、日本時間の当日23:59を締切として扱う。
              return new Date(Date.UTC(year, month, day, 14, 59, 59, 999));
            })()
          : null;
        await prisma.task.upsert({ where: { sourceProvider_sourceGroupId_sourceExternalId_userId: { sourceProvider: "classroom", sourceGroupId: course.id, sourceExternalId: work.id, userId } }, create: { userId, subject: course.name || "Google Classroom", title: work.title || "Classroomの課題", dueDate, note: [work.description, work.alternateLink].filter(Boolean).join("\n"), sourceProvider: "classroom", sourceGroupId: course.id, sourceExternalId: work.id, sourceUrl: work.alternateLink, isCompleted: false, isVisible }, update: { subject: course.name || "Google Classroom", title: work.title || "Classroomの課題", dueDate, note: [work.description, work.alternateLink].filter(Boolean).join("\n"), sourceUrl: work.alternateLink, isVisible } });
      }
      const announcements = await classroomListAll<{ announcements?: ClassroomAnnouncement[] }>(accessToken, `courses/${encodeURIComponent(course.id)}/announcements?pageSize=100`, "announcements") as ClassroomAnnouncement[];
      for (const item of announcements) {
        const announcement = await prisma.announcement.upsert({ where: { sourceProvider_sourceGroupId_sourceExternalId: { sourceProvider: "classroom", sourceGroupId: course.id, sourceExternalId: item.id } }, create: { title: course.name || "Google Classroomのお知らせ", body: item.text || "", date: item.creationTime ? new Date(item.creationTime) : new Date(), sourceProvider: "classroom", sourceGroupId: course.id, sourceExternalId: item.id, sourceUrl: item.alternateLink }, update: { body: item.text || "", date: item.creationTime ? new Date(item.creationTime) : undefined, sourceUrl: item.alternateLink } });
        await prisma.announcementRecipient.upsert({ where: { userId_announcementId: { userId, announcementId: announcement.id } }, create: { userId, announcementId: announcement.id }, update: {} });
      }
      await prisma.classroomCourse.update({ where: { id: savedCourse.id }, data: { lastSyncedAt: new Date() } });
    }
    await prisma.classroomCourse.updateMany({ where: { connectionId: connection.id, ...(syncedCourseIds.length ? { courseId: { notIn: syncedCourseIds } } : {}) }, data: { isActive: false } });
    await prisma.task.updateMany({ where: { userId, sourceProvider: "classroom", ...(syncedTaskIds.length ? { sourceExternalId: { notIn: syncedTaskIds } } : {}) }, data: { isVisible: false } });
    await prisma.task.updateMany({ where: { userId, sourceProvider: "classroom", isCompleted: true }, data: { isVisible: false } });
    await prisma.classroomConnection.update({ where: { id: connection.id }, data: { status: "connected", lastSyncedAt: new Date(), lastError: null } });
    return { courses: matchedCourses.length, candidates: courses.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "同期に失敗しました。";
    await prisma.classroomConnection.update({ where: { id: connection.id }, data: { status: message.includes("invalid_grant") ? "expired" : "error", lastError: message } });
    throw error;
  }
}
