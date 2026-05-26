import jwt from "jsonwebtoken";
import { getRequiredEnv } from "@/lib/env";

export type AdminSession = {
  role: "admin";
  email: string;
};

export const ADMIN_EMAIL = getRequiredEnv("ADMIN_EMAIL");
export const ADMIN_PASSWORD = getRequiredEnv("ADMIN_PASSWORD");
export const JWT_SECRET = getRequiredEnv("JWT_SECRET");

export function getAdminSessionFromRequest(request: Request): AdminSession | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader
    .split("; ")
    .find((row) => row.startsWith("admin_token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Partial<AdminSession>;
    if (decoded.role !== "admin" || typeof decoded.email !== "string") return null;
    return { role: "admin", email: decoded.email };
  } catch {
    return null;
  }
}
