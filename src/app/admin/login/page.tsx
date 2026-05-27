"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setPasswordError("");
    setLoading(true);
    if (!email.trim()) {
      setEmailError("メールアドレスを入力してください。");
      setLoading(false);
      return;
    }
    if (!password) {
      setPasswordError("パスワードを入力してください。");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) throw new Error(data.error || "ログインに失敗しました。");

      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md space-y-6 login-card admin-theme">
        <div>
          <h1 className="text-center text-2xl font-bold text-[var(--foreground)]">管理者ログイン</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            固定された管理者だけが入れます。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="admin@example.com"
            />
            {emailError && <small className="text-xs text-red-600 mt-1">{emailError}</small>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">パスワード</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
            {passwordError && <small className="text-xs text-red-600 mt-1">{passwordError}</small>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--admin-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--admin)] disabled:opacity-50"
          >
            {loading ? "確認中..." : "管理者としてログイン"}
          </button>
        </form>

        <button
          onClick={() => router.push("/")}
          className="w-full text-center text-sm font-medium text-[var(--admin-600)] hover:text-[var(--admin)]"
        >
          通常ログインへ戻る
        </button>
      </div>
    </main>
  );
}
