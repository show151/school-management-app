import { NextResponse } from "next/server";
import { getRequestMeta, recordAuditLog } from '@/lib/audit-log';

export async function POST(request: Request) {
  const response = NextResponse.json({ message: "管理者ログアウトしました。" });

  response.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  // Also clear regular auth token to fully logout
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  const { ipAddress, userAgent } = getRequestMeta(request);
  await recordAuditLog({
    actorType: 'admin',
    action: 'admin.auth.logout',
    result: 'success',
    ipAddress,
    userAgent,
  });

  return response;
}
