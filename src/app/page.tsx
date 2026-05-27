"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // trueならログイン、falseなら新規登録
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin ? { email, password } : { name, studentNumber: studentNumber ? Number(studentNumber) : null, email, password }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "エラーが発生しました。");
      }

      if (isLogin) {
        setMessage("ログインに成功しました！移動します...");
        // ログイン成功したらメイン画面（ダッシュボード）へ移動
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
      <div className="login-card">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--foreground)]">
            {isLogin ? "スクール管理アプリにログイン" : "新しくアカウントを作成"}
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
                  className="appearance-none rounded-lg relative block w-full bg-white px-3 py-2 border border-gray-300 placeholder-gray-500 text-[var(--foreground)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
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
                className="appearance-none rounded-lg relative block w-full bg-white px-3 py-2 border border-gray-300 placeholder-gray-500 text-[var(--foreground)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
                placeholder="you@example.com"
              />
              {emailError && <small className="text-xs text-red-600">{emailError}</small>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">パスワード</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full bg-white px-3 py-2 border border-gray-300 placeholder-gray-500 text-[var(--foreground)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] text-sm"
                placeholder="••••••••"
              />
              {passwordError && <small className="text-xs text-red-600">{passwordError}</small>}
              {!isLogin && (
                <p className="mt-1 text-xs text-[var(--muted)]">※ 大文字、小文字、数字、記号を含む8文字以上が必要です。</p>
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

        <div className="text-center">
          <button onClick={() => router.push("/admin/login")} className="text-xs font-medium text-[var(--muted)] md:hidden">管理者はこちら</button>
        </div>
      </div>
    </main>
  );
}
