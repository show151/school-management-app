import { jwtVerify } from 'jose';
import { getRequiredEnv } from "@/lib/env";

export type AdminSession = {
  role: "admin";
  email: string;
};

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;
export const JWT_SECRET = getRequiredEnv("JWT_SECRET");

export async function getAdminSessionFromRequest(request: Request): Promise<AdminSession | null> {
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
