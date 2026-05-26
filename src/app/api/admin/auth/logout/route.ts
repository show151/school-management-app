import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "管理者ログアウトしました。" });

  response.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}
