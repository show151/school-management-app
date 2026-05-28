"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Test = { id: string; subject: string; period: number; range: string; testDate: string };
type User = { id: string; name: string; email: string; createdAt: string };

export default function AdminTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subject, setSubject] = useState("");
  const [period, setPeriod] = useState("");
  const [range, setRange] = useState("");
  const [testDate, setTestDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [subjectError, setSubjectError] = useState("");
  const [periodError, setPeriodError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [testDateError, setTestDateError] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetch("/api/admin/tests", { credentials: "same-origin" }), fetch("/api/admin/users", { credentials: "same-origin" })])
      .then(async ([testsRes, usersRes]) => {
        if (!testsRes.ok || !usersRes.ok) throw new Error();
        return { nextTests: (await testsRes.json()) as Test[], nextUsers: (await usersRes.json()) as User[] };
      })
      .then(({ nextTests, nextUsers }) => {
        if (isMounted) { setTests(nextTests); setUsers(nextUsers); }
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [router]);

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError(""); setPeriodError(""); setRangeError(""); setTestDateError("");
    if (!subject) setSubjectError("教科を入力してください。");
    if (!period) setPeriodError("時限を入力してください。");
    if (!range) setRangeError("範囲を入力してください。");
    if (!testDate) setTestDateError("テスト日時を入力してください。");
    if (!subject || !period || !range || !testDate) return;

    const res = await fetch("/api/admin/tests", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, period: parseInt(period), range, testDate }),
    });
    if (!res.ok) { alert("追加に失敗しました。"); return; }

    if (selectedUserIds.length > 0) {
      const emailRes = await fetch("/api/admin/send-email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "test", userIds: selectedUserIds, payload: { subject, testDate, range } }),
      });
      if (!emailRes.ok) {
        const error = await emailRes.json().catch(() => ({ error: "Unknown error" }));
        alert(`メール送信に失敗しました: ${error.error}`);
      }
    }

    setSubject(""); setPeriod(""); setRange(""); setTestDate(""); setSelectedUserIds([]);
    const testsRes = await fetch("/api/admin/tests", { credentials: "same-origin" });
    if (testsRes.ok) setTests(await testsRes.json());
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm("このテスト情報を削除してもよろしいですか？")) return;
    const res = await fetch("/api/admin/tests", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setTests(tests.filter(t => t.id !== id));
    else alert("削除に失敗しました。");
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      <div className="container-responsive py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/admin")} className="text-sm font-medium admin-link md:hidden">管理メニューへ戻る</button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">テスト情報管理</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card h-fit">
            <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">新しいテストを追加</h2>
            <form onSubmit={handleAddTest} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">教科</label>
                <input type="text" placeholder="例: 数学" value={subject} onChange={(e) => setSubject(e.target.value)} />
                {subjectError && <small className="text-xs text-red-600 mt-1 block">{subjectError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">時限</label>
                <input type="number" min="1" placeholder="例: 1" value={period} onChange={(e) => setPeriod(e.target.value)} />
                {periodError && <small className="text-xs text-red-600 mt-1 block">{periodError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">範囲</label>
                <input type="text" placeholder="例: 第1章～第3章" value={range} onChange={(e) => setRange(e.target.value)} />
                {rangeError && <small className="text-xs text-red-600 mt-1 block">{rangeError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">テスト日時</label>
                <input type="datetime-local" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
                {testDateError && <small className="text-xs text-red-600 mt-1 block">{testDateError}</small>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  送信するユーザー
                  {selectedUserIds.length > 0 && <span className="ml-2 admin-pill">{selectedUserIds.length}人</span>}
                </label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
                  {users.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">ユーザーが登録されていません</p>
                  ) : (
                    users.map((user) => (
                      <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--admin-50)]">
                        <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleUserSelection(user.id)} className="cursor-pointer" />
                        <p className="text-xs font-medium text-[var(--foreground)]">{user.name}</p>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button type="button" onClick={() => setSelectedUserIds(users.map(u => u.id))} className="w-full admin-outline">すべて選択</button>
                <button type="submit" className="w-full admin-btn">追加 + メール送信</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">現在のテスト一覧</h2>
            {tests.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">登録されているテストはありません。</p>
            ) : (
              <div className="space-y-2">
                {tests.map((test) => (
                  <div key={test.id} className="flex items-start justify-between rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">【{test.subject}】{test.period}時限</p>
                      <p className="text-xs text-[var(--muted)]">範囲: {test.range}</p>
                      <p className="text-xs text-[var(--muted)]">日時: {new Date(test.testDate).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDeleteTest(test.id)} className="text-xs font-medium text-red-500 hover:text-red-700 ml-2 shrink-0">削除</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
