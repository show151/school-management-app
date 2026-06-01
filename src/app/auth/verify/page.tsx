"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(() => token ? "loading" : "error");
  const [message, setMessage] = useState(() => token ? "" : "確認トークンが見つかりません。");

  useEffect(() => {
    if (!token) {
      return;
    }

    fetch(`/api/auth/verify?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message ?? "メールアドレスの確認が完了しました。");
        } else {
          setStatus("error");
          setMessage(data.error ?? "確認に失敗しました。");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("サーバーエラーが発生しました。");
      });
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="login-card text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="text-4xl">⏳</div>
            <p className="text-[var(--muted)]">確認中...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl">✅</div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">確認完了</h1>
            <p className="text-sm text-[var(--muted)]">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full btn-primary"
            >
              ログインする
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl">❌</div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">確認失敗</h1>
            <p className="text-sm text-red-600">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full btn-primary"
            >
              トップへ戻る
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
