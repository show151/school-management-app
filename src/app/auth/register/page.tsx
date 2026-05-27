"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      alert("名前・メール・パスワードを入力してください。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
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
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">ユーザー登録</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">名前</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2"
            placeholder="山田 太郎"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2"
            placeholder="user@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2"
            placeholder="8文字以上の安全なパスワード"
            required
          />
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

      <p className="mt-4 text-sm text-gray-600">
        既にアカウントをお持ちですか？ <a href="/login" className="text-blue-600">ログイン</a>
      </p>
    </div>
  );
}
