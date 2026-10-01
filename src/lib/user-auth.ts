import { jwtVerify } from "jose";
import { getRequiredEnv } from "@/lib/env";

const JWT_SECRET = getRequiredEnv("JWT_SECRET");

export async function getAuthenticatedUserId(request: Request) {
  const token = (request.headers.get("cookie") || "").split("; ").find((row) => row.startsWith("auth_token="))?.split("=")[1];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}
