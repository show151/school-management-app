"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // trueならログイン、falseなら新規登録
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [studentNumberError, setStudentNumberError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    setNameError(""); setStudentNumberError(""); setEmailError(""); setPasswordError("");
    if (!isLogin && !name.trim()) setNameError('名前を入力してください。');
    if (!email.trim()) setEmailError('メールアドレスを入力してください。');
    if (!password) setPasswordError('パスワードを入力してください。');
    if ((!isLogin && !name.trim()) || !email.trim() || !password) {
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin ? { email, password } : { name, studentNumber: studentNumber ? Number(studentNumber) : null, email, password }),
      });

      const data = (await res.json()) as { error?: string; user?: { email?: string; isAdmin?: boolean } };

      if (!res.ok) {
        throw new Error(data.error || "エラーが発生しました。");
      }

      if (isLogin) {
        setMessage("ログインに成功しました！移動します...");
        // 管理者アカウントでも最初はダッシュボードへ（フルリロードして Header を更新）
        if (data.user?.isAdmin) {
          window.location.href = "/dashboard";
          return;
        }
        // 通常ユーザーはダッシュボードへ
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        setMessage("ユーザー登録が完了しました！ログインしてください。");
        setIsLogin(true);
        setName("");
        setStudentNumber("");
        setPassword("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="login-card w-full max-w-md mx-auto">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--foreground)]">
            {isLogin ? "高専管理アプリにログイン" : "新しくアカウントを作成"}
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--muted)]">
            課題やテストの提出遅れをゼロに
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">{error}</div>
          )}
          {message && (
            <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded">{message}</div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">名前</label>
                <input
                  type="text"
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full bg-[var(--card)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
                  style={{ color: 'var(--foreground)' }}
                  placeholder="太郎"
                />
                {nameError && <small className="text-xs text-red-600">{nameError}</small>}
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">出席番号（任意）</label>
                <input
                  type="number"
                  min="1"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="例: 15"
                  className="appearance-none rounded-lg relative block w-full bg-[var(--card)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
                  style={{ color: 'var(--foreground)' }}
                />
                {studentNumberError && <small className="text-xs text-red-600">{studentNumberError}</small>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">メールアドレス</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full bg-[var(--card)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
                  style={{ color: 'var(--foreground)' }}
                  placeholder="you@example.com"
                />
              {emailError && <small className="text-xs text-red-600">{emailError}</small>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full bg-[var(--card)] px-3 py-2 pr-10 border border-[var(--border)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
                  style={{ color: 'var(--foreground)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && <small className="text-xs text-red-600">{passwordError}</small>}
              {!isLogin && (
                <p className="mt-1 text-xs text-[var(--muted)]">※ 大文字、小文字、数字、記号を含む8文字以上が必要です。</p>
              )}
              {isLogin && (
                <div className="mt-2 text-right">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-700)] transition duration-150"
                  >
                    パスワードを忘れた方はこちら
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[var(--primary)] hover:bg-[var(--primary-700)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition duration-150 ease-in-out disabled:opacity-50"
            >
              {loading ? "処理中..." : isLogin ? "ログインする" : "アカウントを登録する"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setName("");
              setError("");
              setMessage("");
            }}
            className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-700)] transition duration-150"
          >
            {isLogin ? "まだ登録していない方はこちら（新規登録）" : "すでに登録済みの方はこちら（ログイン）"}
          </button>
        </div>

        {/* 管理者リンクはヘッダーの `isAdmin` によって表示されます */}
      </div>
    </main>
  );
}
