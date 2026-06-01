"use client";

import Link from "next/link";
import { useState } from "react";

type ApiResponse = {
  message?: string;
  error?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setMessage("");
    setError("");

    if (!email.trim()) {
      setEmailError("メールアドレスを入力してください。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok) {
        throw new Error(data.error || "リセットメールの送信に失敗しました。");
      }

      setMessage(data.message || "パスワードリセット用のリンクをメールで送信しました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "サーバーエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="login-card">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">パスワードを再設定</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            登録済みのメールアドレスにリセット用リンクを送信します。
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">{error}</div>
          )}
          {message && (
            <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded">{message}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="appearance-none rounded-lg relative block w-full bg-[var(--card)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
            />
            {emailError && <small className="text-xs text-red-600">{emailError}</small>}
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
            {loading ? "送信中..." : "リセットリンクを送信"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-700)] transition duration-150"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
