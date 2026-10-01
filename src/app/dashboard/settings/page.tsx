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
  const [classroom, setClassroom] = useState<{ connected: boolean; connection?: { googleEmail?: string; status?: string; lastSyncedAt?: string | null } | null }>({ connected: false });
  const [classroomMessage, setClassroomMessage] = useState("");
  const [classroomLoading, setClassroomLoading] = useState(false);

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

  useEffect(() => {
    fetch('/api/integrations/classroom/status').then((res) => res.ok ? res.json() : null).then((data) => { if (data) setClassroom(data); }).catch(() => undefined);
    const params = new URLSearchParams(window.location.search);
    if (params.get('classroom') === 'connected') setClassroomMessage('Google Classroomと連携しました。');
    if (params.get('classroom') === 'error') setClassroomMessage(params.get('message') || 'Classroom連携に失敗しました。');
  }, []);

  const syncClassroom = async () => {
    setClassroomLoading(true); setClassroomMessage("");
    try {
      const res = await fetch('/api/integrations/classroom/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setClassroomMessage(data.error || '同期に失敗しました。'); return; }
      setClassroomMessage(`${data.courses ?? 0}コースを同期しました。`);
      const status = await fetch('/api/integrations/classroom/status');
      if (status.ok) setClassroom(await status.json());
    } finally { setClassroomLoading(false); }
  };

  const disconnectClassroom = async () => {
    if (!window.confirm('Google Classroomとの連携を解除しますか？')) return;
    setClassroomLoading(true);
    try { await fetch('/api/integrations/classroom/connection', { method: 'DELETE' }); setClassroom({ connected: false }); setClassroomMessage('Classroom連携を解除しました。'); }
    finally { setClassroomLoading(false); }
  };

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
              <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">Google Classroom</h2>
              {classroomMessage && <div className="p-3 mb-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">{classroomMessage}</div>}
              {classroom.connected ? (
                <>
                  <p className="text-sm text-[var(--muted)]">連携済み: {classroom.connection?.googleEmail}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">最終同期: {classroom.connection?.lastSyncedAt ? new Date(classroom.connection.lastSyncedAt).toLocaleString('ja-JP') : '未実行'}</p>
                  <div className="flex gap-2 mt-4"><button type="button" onClick={syncClassroom} disabled={classroomLoading} className="btn-primary disabled:opacity-50">{classroomLoading ? '処理中...' : '今すぐ同期'}</button><button type="button" onClick={disconnectClassroom} disabled={classroomLoading} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 disabled:opacity-50">連携解除</button></div>
                </>
              ) : <a href="/api/integrations/classroom/connect" className="inline-block btn-primary mt-3">Google Classroomと連携</a>}
            </div>
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
