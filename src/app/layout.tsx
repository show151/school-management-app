import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getRequiredEnv } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "スクール管理アプリ",
  description: "課題・時間割・連絡を一元管理",
};

async function getIsAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return false;
    const secret = new TextEncoder().encode(getRequiredEnv("JWT_SECRET"));
    const { payload } = await jwtVerify(token, secret);
    return (payload as { role?: string }).role === "admin";
  } catch {
    return false;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAdmin = await getIsAdmin();

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[var(--background)]">
        <div className="container-responsive">
          <Header isAdmin={isAdmin} />
        </div>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
