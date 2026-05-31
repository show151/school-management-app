"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(""); setEmailError(""); setPasswordError("");
    if (!name.trim()) setNameError('名前を入力してください。');
    if (!email.trim()) setEmailError('メールアドレスを入力してください。');
    if (!password) setPasswordError('パスワードを入力してください。');
    if (!name.trim() || !email.trim() || !password) return;

    setLoading(true);
    try {
        const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, studentNumber: studentNumber ? Number(studentNumber) : null }),
      });

      if (res.ok) {
        alert("登録が完了しました。ログイン画面に移動します。");
        router.push("/login");
        return;
      }

      const err = await res.json().catch(() => ({ error: "登録に失敗しました" }));
      alert(err.error || "登録に失敗しました");
    } catch (err) {
      console.error(err);
      alert("サーバーエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="login-card">
        <h1 className="text-2xl font-semibold mb-4 text-[var(--foreground)] text-center">ユーザー登録</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
          <label className="block text-sm font-medium">名前</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-xl border px-3 py-2 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            placeholder="山田 太郎"
            required
          />
          {nameError && <small className="text-xs text-red-600">{nameError}</small>}
        </div>

          <div>
            <label className="block text-sm font-medium">出席番号（任意）</label>
            <input
              type="number"
              min="1"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              className="mt-1 block w-full rounded px-3 py-2 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
              placeholder="例: 15"
            />
          </div>

        <div>
          <label className="block text-sm font-medium">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded px-3 py-2 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
            placeholder="user@example.com"
            required
          />
          {emailError && <small className="text-xs text-red-600">{emailError}</small>}
        </div>

        <div>
          <label className="block text-sm font-medium">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded px-3 py-2 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
            placeholder="8文字以上の安全なパスワード"
            required
          />
          {passwordError && <small className="text-xs text-red-600">{passwordError}</small>}
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
          >
            {loading ? "登録中..." : "登録"}
          </button>
        </div>
      </form>

        <p className="mt-4 text-sm text-[var(--muted)] text-center">
        既にアカウントをお持ちですか？ <a href="/login" className="text-[var(--primary)]">ログイン</a>
      </p>
      </div>
    </div>
  );
}
