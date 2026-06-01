"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

type ApiResponse = {
  message?: string;
  error?: string;
};

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setMessage("");
    setError("");

    if (!token) {
      setError("リセットトークンが見つかりません。もう一度リセットをリクエストしてください。");
      return;
    }
    if (!password) {
      setPasswordError("新しいパスワードを入力してください。");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("確認用パスワードが一致しません。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok) {
        throw new Error(data.error || "パスワードの再設定に失敗しました。");
      }

      setCompleted(true);
      setPassword("");
      setConfirmPassword("");
      setMessage(data.message || "パスワードを再設定しました。");
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">新しいパスワードを設定</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            半角の大文字、小文字、数字、記号を含む8文字以上で入力してください。
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">{error}</div>
          )}
          {message && (
            <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded">{message}</div>
          )}

          {!completed && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">新しいパスワード</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上の安全なパスワード"
                  className="appearance-none rounded-lg relative block w-full bg-[var(--card)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">新しいパスワード（確認）</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力してください"
                  className="appearance-none rounded-lg relative block w-full bg-[var(--card)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
                />
                {passwordError && <small className="text-xs text-red-600">{passwordError}</small>}
              </div>

              <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
                {loading ? "設定中..." : "パスワードを再設定"}
              </button>
            </>
          )}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
