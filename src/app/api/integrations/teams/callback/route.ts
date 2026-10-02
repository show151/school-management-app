import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getRequiredEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/classroom";
import { syncTeamsForUser, exchangeMicrosoftAuthorizationCode, getTeamsRedirectUri, TEAMS_SCOPES } from "@/lib/teams";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectBase = `${process.env.APP_URL || url.origin}/dashboard/settings`;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const storedState = request.headers.get("cookie")?.split("; ").find((row) => row.startsWith("teams_oauth_state="))?.split("=")[1];
  const clearCookie = (response: NextResponse) => {
    response.cookies.set("teams_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  };

  if (!state || !code || !storedState || state !== storedState) return clearCookie(NextResponse.redirect(`${redirectBase}?teams=state_error`));
  try {
    const { payload } = await jwtVerify(state, new TextEncoder().encode(getRequiredEnv("JWT_SECRET")));
    if (payload.purpose !== "teams-oauth" || typeof payload.userId !== "string") throw new Error("invalid state");
    const tokenData = await exchangeMicrosoftAuthorizationCode(code, getTeamsRedirectUri(request));
    if (!tokenData.refresh_token) throw new Error("Microsoftの更新用トークンを取得できませんでした。");
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName", { headers: { Authorization: `Bearer ${tokenData.access_token}` }, cache: "no-store" });
    const profile = await profileResponse.json() as { id?: string; mail?: string; userPrincipalName?: string; error?: { message?: string } };
    if (!profileResponse.ok || !profile.id) throw new Error("Microsoftプロフィールを取得できませんでした。");
    await prisma.teamsConnection.upsert({
      where: { userId: payload.userId },
      create: { userId: payload.userId, microsoftUserId: profile.id, microsoftEmail: profile.mail || profile.userPrincipalName || "", encryptedRefreshToken: encryptSecret(tokenData.refresh_token), scopes: tokenData.scope || TEAMS_SCOPES.join(" "), status: "connected" },
      update: { microsoftUserId: profile.id, microsoftEmail: profile.mail || profile.userPrincipalName || "", encryptedRefreshToken: encryptSecret(tokenData.refresh_token), scopes: tokenData.scope || TEAMS_SCOPES.join(" "), status: "connected", lastError: null },
    });
    await syncTeamsForUser(payload.userId);
    return clearCookie(NextResponse.redirect(`${redirectBase}?teams=connected`));
  } catch (error) {
    console.error("Teams OAuth callback failed:", error instanceof Error ? error.message : "unknown error");
    return clearCookie(NextResponse.redirect(`${redirectBase}?teams=error`));
  }
}
