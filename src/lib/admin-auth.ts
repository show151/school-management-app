/**
 * @file admin-auth.ts
 * @description 管理者認証に関するユーティリティ関数を提供します。
 * 環境変数から管理者の資格情報を取得し、JWTを用いたセッション検証を行います。
 */
import { jwtVerify } from 'jose';
import { getRequiredEnv } from "@/lib/env";

export type AdminSession = {
  role: "admin";
  email: string;
};

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;
export const JWT_SECRET = getRequiredEnv("JWT_SECRET");

/**
 * リクエストのCookieから管理者セッション（JWTトークン）を取得・検証し、
 * 有効な管理者であればセッション情報を返します。
 * @param request - HTTPリクエストオブジェクト
 * @returns 管理者セッション情報、または無効な場合はnull
 */
export async function getAdminSessionFromRequest(request: Request): Promise<AdminSession | null> {
  // Cookieヘッダーを取得
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader
    .split("; ")
    .find((row) => row.startsWith("admin_token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const decoded = payload as Partial<AdminSession>;
    if (decoded.role !== "admin" || typeof decoded.email !== "string") return null;
    return { role: "admin", email: decoded.email };
  } catch {
    return null;
  }
}
