"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; studentNumber: number | null; name: string; email: string; createdAt: string };

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editStudentNumber, setEditStudentNumber] = useState<string>("");
  const [editName, setEditName] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => {
        if (!res.ok) throw new Error("ユーザー情報の取得に失敗しました。");
        return res.json();
      })
      .then((data) => setUsers(data))
      .catch((err) => setError(err instanceof Error ? err.message : "エラーが発生しました。"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      <div className="container-responsive py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/admin")} className="text-sm font-medium admin-link md:hidden">
            ← 管理メニューに戻る
          </button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">ユーザー管理</h1>
          <div className="w-32" />
        </div>

        {loading && <div className="card p-6 text-center text-[var(--muted)]">読み込み中...</div>}

        {error && (
          <div className="rounded-xl p-4 bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full divide-y" style={{ borderColor: "var(--border)" }}>
                  <thead style={{ backgroundColor: "var(--admin-50)" }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--admin-600)]">出席番号</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--admin-600)]">名前</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--admin-600)]">メールアドレス</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--admin-600)]">登録日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-sm text-[var(--muted)]">
                          ユーザーがまだ登録されていません。
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                          <tr key={user.id} className="hover:bg-[var(--admin-50)] transition-colors">
                            {editingUserId === user.id ? (
                              <>
                                <td className="px-4 py-4 text-sm font-bold text-[var(--admin-600)]">
                                  <input
                                    type="number"
                                    className="w-20"
                                    value={editStudentNumber}
                                    onChange={(e) => setEditStudentNumber(e.target.value)}
                                    placeholder="-"
                                  />
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-[var(--foreground)]">
                                  <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                </td>
                                <td className="px-4 py-4 text-sm text-[var(--muted)]">{user.email}</td>
                                <td className="px-4 py-4 text-sm text-[var(--muted)]">
                                  <div className="flex gap-2">
                                    <button
                                      className="text-sm admin-btn"
                                      onClick={async () => {
                                        const payload: any = { id: user.id };
                                        payload.studentNumber = editStudentNumber === '' ? null : Number(editStudentNumber);
                                        payload.name = editName;
                                        try {
                                          const res = await fetch('/api/admin/users', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(payload),
                                          });
                                          if (!res.ok) {
                                            const err = await res.json().catch(() => ({ error: '更新に失敗しました' }));
                                            alert(`更新に失敗しました: ${err.error || err.details || 'Unknown'}`);
                                            return;
                                          }
                                          const updated = await res.json();
                                          setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, studentNumber: updated.studentNumber, name: updated.name } : u)));
                                          setEditingUserId(null);
                                        } catch (e) {
                                          alert('更新中にエラーが発生しました。');
                                        }
                                      }}
                                    >
                                      保存
                                    </button>
                                    <button className="text-sm admin-outline" onClick={() => setEditingUserId(null)}>キャンセル</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-4 text-sm font-bold text-[var(--admin-600)]">{user.studentNumber ?? '-'}</td>
                                <td className="px-4 py-4 text-sm font-medium text-[var(--foreground)]">{user.name}</td>
                                <td className="px-4 py-4 text-sm text-[var(--muted)]">{user.email}</td>
                                <td className="px-4 py-4 text-sm text-[var(--muted)]">{new Date(user.createdAt).toLocaleDateString("ja-JP")}
                                  <div className="mt-2">
                                    <button className="text-xs admin-outline" onClick={() => { setEditingUserId(user.id); setEditStudentNumber(user.studentNumber === null ? '' : String(user.studentNumber)); setEditName(user.name); }}>編集</button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-sm text-[var(--muted)]">合計: <span className="font-semibold text-[var(--foreground)]">{users.length}</span> ユーザー</p>
          </>
        )}
      </div>
    </div>
  );
}
