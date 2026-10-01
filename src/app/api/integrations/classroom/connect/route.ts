import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getRequiredEnv } from "@/lib/env";
import { getAuthenticatedUserId } from "@/lib/user-auth";
import { CLASSROOM_SCOPES, getClassroomRedirectUri } from "@/lib/classroom";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  const secret = new TextEncoder().encode(getRequiredEnv("JWT_SECRET"));
  const state = await new SignJWT({ userId, purpose: "classroom-oauth" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(secret);
  const redirectUri = getClassroomRedirectUri(request);
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || "", redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", scope: CLASSROOM_SCOPES.join(" "), state });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.cookies.set("classroom_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
