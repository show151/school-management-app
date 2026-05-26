import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // 🔒 レート制限チェック（ブルートフォース攻撃対策）
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `${ip}:admin-login`;
    
    // 1時間に5回まで（通常ユーザーより厳しく）
    if (!checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "ログインの試行回数が多すぎます。少し時間をおいてから再度お試しください。" },
        { status: 429 }
      );
    }

    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "管理者情報が正しくありません。" },
        { status: 401 }
      );
    }

    const token = jwt.sign({ role: "admin", email }, JWT_SECRET, { expiresIn: "8h" });
    const response = NextResponse.json({ message: "管理者ログインに成功しました。" });

    // 🔒 クッキーに安全に保存
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
