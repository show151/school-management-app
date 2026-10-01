import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isProvider, type IntegrationProvider } from "@/lib/external-integrations";

type Member = { externalUserId: string; email?: string };

async function fetchMembers(provider: IntegrationProvider, groupId: string): Promise<Member[]> {
  if (provider === "teams") {
    const token = process.env.INTEGRATION_TEAMS_ACCESS_TOKEN;
    if (!token) throw new Error("INTEGRATION_TEAMS_ACCESS_TOKENが未設定です。");
    const response = await fetch(`https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(groupId.split(":")[0])}/channels/${encodeURIComponent(groupId.split(":")[1] || "")}/members`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Teams API error: ${response.status}`);
    const data = await response.json() as { value?: Array<Record<string, unknown>> };
    return (data.value || []).map((member) => ({ externalUserId: String(member.userId || member.id), email: typeof member.email === "string" ? member.email : typeof member.emailAddress === "string" ? member.emailAddress : undefined })).filter((member) => member.externalUserId !== "undefined");
  }
  if (provider === "classroom") {
    const token = process.env.INTEGRATION_CLASSROOM_ACCESS_TOKEN;
    if (!token) throw new Error("INTEGRATION_CLASSROOM_ACCESS_TOKENが未設定です。");
    const response = await fetch(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(groupId)}/students`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Google Classroom API error: ${response.status}`);
    const data = await response.json() as { students?: Array<{ userId?: string; profile?: { emailAddress?: string } }> };
    return (data.students || []).map((student) => ({ externalUserId: student.userId || "", email: student.profile?.emailAddress })).filter((member) => member.externalUserId);
  }
  const baseUrl = process.env.INTEGRATION_MOODLE_URL;
  const token = process.env.INTEGRATION_MOODLE_TOKEN;
  if (!baseUrl || !token) throw new Error("INTEGRATION_MOODLE_URLとINTEGRATION_MOODLE_TOKENが未設定です。");
  const url = new URL(baseUrl);
  url.searchParams.set("wstoken", token);
  url.searchParams.set("wsfunction", "core_enrol_get_enrolled_users");
  url.searchParams.set("moodlewsrestformat", "json");
  url.searchParams.set("courseid", groupId);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Moodle API error: ${response.status}`);
  const data = await response.json() as Array<{ id?: number; email?: string }>;
  return (Array.isArray(data) ? data : []).map((member) => ({ externalUserId: member.id ? String(member.id) : "", email: member.email })).filter((member) => member.externalUserId);
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  if (!await getAdminSessionFromRequest(request)) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  const { provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ error: "対応していない連携先です。" }, { status: 404 });
  try {
    const { groupId } = await request.json() as { groupId?: string };
    if (!groupId?.trim()) return NextResponse.json({ error: "groupIdが必要です。" }, { status: 400 });
    const members = await fetchMembers(provider, groupId.trim());
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    let linked = 0;
    for (const member of members) {
      const user = users.find((candidate) => member.email && candidate.email.toLowerCase() === member.email.toLowerCase());
      if (!user) continue;
      await prisma.integrationIdentity.upsert({ where: { provider_externalUserId: { provider, externalUserId: member.externalUserId } }, create: { provider, externalGroupId: groupId.trim(), externalUserId: member.externalUserId, email: member.email?.toLowerCase() || null, userId: user.id }, update: { externalGroupId: groupId.trim(), email: member.email?.toLowerCase() || null, userId: user.id } });
      linked += 1;
    }
    return NextResponse.json({ provider, received: members.length, linked });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "参加者の同期に失敗しました。" }, { status: 400 });
  }
}
