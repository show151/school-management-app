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
  const [studentNumber, setStudentNumber] = useState("");
  const [studentNumberLoading, setStudentNumberLoading] = useState(false);
  const [studentNumberMessage, setStudentNumberMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.user) {
          if (data.user.name) setName(data.user.name);
          setStudentNumber(data.user.studentNumber === null || typeof data.user.studentNumber === 'undefined' ? '' : String(data.user.studentNumber));
        }
      } catch {
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

  const handleStudentNumberSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentNumberMessage("");

    if (studentNumber && !/^\d+$/.test(studentNumber)) {
      setStudentNumberMessage('出席番号は1以上の整数で入力してください。');
      return;
    }

    setStudentNumberLoading(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentNumber: studentNumber === '' ? null : Number(studentNumber) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStudentNumberMessage(data.error || '更新に失敗しました。');
        return;
      }
      setStudentNumberMessage('出席番号を更新しました。');
      if (data.user?.studentNumber === null || typeof data.user?.studentNumber === 'undefined') {
        setStudentNumber('');
      } else {
        setStudentNumber(String(data.user.studentNumber));
      }
    } finally {
      setStudentNumberLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="container-responsive py-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push("/dashboard")} className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">← ダッシュボード</button>
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">設定</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <div className="card w-full">
              <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">プロフィール</h2>
              <form onSubmit={handleNameSave} className="space-y-4">
                {nameMessage && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">{nameMessage}</div>}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">表示名</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <button type="submit" disabled={nameLoading} className="w-full btn-primary disabled:opacity-50 mt-2">
                  {nameLoading ? '保存中...' : '名前を保存する'}
                </button>
              </form>
            </div>

            <div className="card w-full">
              <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">出席番号</h2>
              <form onSubmit={handleStudentNumberSave} className="space-y-4">
                {studentNumberMessage && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">{studentNumberMessage}</div>}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">出席番号</label>
                  <input type="number" min="1" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="未設定" />
                  <p className="mt-1 text-xs text-[var(--muted)]">空欄にすると未設定に戻せます。</p>
                </div>
                <button type="submit" disabled={studentNumberLoading} className="w-full btn-primary disabled:opacity-50 mt-2">
                  {studentNumberLoading ? '保存中...' : '出席番号を保存する'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card w-full">
              <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">パスワード変更</h2>
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
                <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50 mt-2">
                  {loading ? "変更中..." : "パスワードを変更する"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
