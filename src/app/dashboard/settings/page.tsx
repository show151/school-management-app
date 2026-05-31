"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMessage, setNameMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.user?.name) setName(data.user.name);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (next !== confirm) { setError("新しいパスワードが一致しません。"); return; }
    if (next.length < 8) { setError("新しいパスワードは8文字以上にしてください。"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "変更に失敗しました。"); return; }
      setSuccess("パスワードを変更しました。");
      setCurrent(""); setNext(""); setConfirm("");
    } finally {
      setLoading(false);
    }
  };

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMessage("");
    if (!name || name.trim().length === 0) { setNameMessage('名前を入力してください。'); return; }
    setNameLoading(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setNameMessage(data.error || '更新に失敗しました。'); return; }
      setNameMessage('名前を更新しました。');
    } finally { setNameLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="container-responsive py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">← ダッシュボード</button>
        </div>

        <div className="card max-w-md">
          <h1 className="text-xl font-bold text-[var(--foreground)] mb-6">プロフィール</h1>
          <form onSubmit={handleNameSave} className="space-y-4 mb-6">
            {nameMessage && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">{nameMessage}</div>}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">表示名</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <button type="submit" disabled={nameLoading} className="w-full btn-primary disabled:opacity-50">
              {nameLoading ? '保存中...' : '名前を保存する'}
            </button>
          </form>

          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">パスワード変更</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
            {success && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">現在のパスワード</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">新しいパスワード</label>
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required placeholder="8文字以上" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">新しいパスワード（確認）</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="もう一度入力" />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
              {loading ? "変更中..." : "パスワードを変更する"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
