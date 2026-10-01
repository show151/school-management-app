import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getRequiredEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { encryptSecret, getClassroomRedirectUri, syncClassroomForUser } from "@/lib/classroom";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const storedState = request.headers.get("cookie")?.split("; ").find((row) => row.startsWith("classroom_oauth_state="))?.split("=")[1];
  const redirectBase = `${process.env.APP_URL || url.origin}/dashboard/settings`;
  if (!state || !code || !storedState || state !== storedState) return NextResponse.redirect(`${redirectBase}?classroom=state_error`);
  try {
    const { payload } = await jwtVerify(state, new TextEncoder().encode(getRequiredEnv("JWT_SECRET")));
    if (payload.purpose !== "classroom-oauth" || typeof payload.userId !== "string") throw new Error("invalid state");
    const redirectUri = getClassroomRedirectUri(request);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "", redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    const tokenData = await tokenResponse.json() as { access_token?: string; refresh_token?: string; scope?: string; error?: string };
    if (!tokenResponse.ok || !tokenData.access_token || !tokenData.refresh_token) throw new Error(tokenData.error || "Google OAuthトークン取得に失敗しました。");
    const profileResponse = await fetch("https://classroom.googleapis.com/v1/userProfiles/me", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const profileBody = await profileResponse.json().catch(() => ({})) as { id?: string; emailAddress?: string; error?: { status?: string; message?: string; details?: unknown[] } };
    if (!profileResponse.ok || !profileBody.id || !profileBody.emailAddress) {
      console.error("Classroom profile request failed:", JSON.stringify({
        status: profileResponse.status,
        errorStatus: profileBody.error?.status,
        errorMessage: profileBody.error?.message,
      }));
      throw new Error("Google Classroomプロフィールを取得できませんでした。");
    }
    const profile = profileBody;
    await prisma.classroomConnection.upsert({ where: { userId: payload.userId }, create: { userId: payload.userId, googleUserId: profile.id, googleEmail: profile.emailAddress, encryptedRefreshToken: encryptSecret(tokenData.refresh_token), scopes: tokenData.scope || "", status: "connected" }, update: { googleUserId: profile.id, googleEmail: profile.emailAddress, encryptedRefreshToken: encryptSecret(tokenData.refresh_token), scopes: tokenData.scope || "", status: "connected", lastError: null } });
    await syncClassroomForUser(payload.userId);
    const response = NextResponse.redirect(`${redirectBase}?classroom=connected`);
    response.cookies.set("classroom_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    console.error("Classroom OAuth callback failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.redirect(`${redirectBase}?classroom=error`);
  }
}
