import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getRequiredEnv } from "@/lib/env";
import { getAuthenticatedUserId } from "@/lib/user-auth";
import { getTeamsAuthorizeUrl, getTeamsRedirectUri, TEAMS_SCOPES } from "@/lib/teams";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const state = await new SignJWT({ userId, purpose: "teams-oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(getRequiredEnv("JWT_SECRET")));
  const params = {
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    redirect_uri: getTeamsRedirectUri(request),
    response_type: "code",
    response_mode: "query",
    scope: TEAMS_SCOPES.join(" "),
    state,
    prompt: "select_account",
  };
  const response = NextResponse.redirect(getTeamsAuthorizeUrl(params));
  response.cookies.set("teams_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
