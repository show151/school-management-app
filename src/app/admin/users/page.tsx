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
  const [studentNumberDraft, setStudentNumberDraft] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const reloadUsers = () => {
    fetch("/api/admin/users", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error("ユーザー情報の取得に失敗しました。");
        return res.json();
      })
      .then((data) => setUsers(data))
      .catch((err) => setError(err instanceof Error ? err.message : "エラーが発生しました。"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reloadUsers();
  }, []);

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setStudentNumberDraft(user.studentNumber === null ? "" : String(user.studentNumber));
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setStudentNumberDraft("");
  };

  const saveStudentNumber = async (userId: string) => {
    setSavingUserId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, studentNumber: studentNumberDraft === "" ? null : Number(studentNumberDraft) }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "出席番号の更新に失敗しました。");
      }

      const updated = (await res.json()) as User;
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setSavingUserId(null);
    }
  };

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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--admin-600)]">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-sm text-[var(--muted)]">
                          ユーザーがまだ登録されていません。
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-[var(--admin-50)] transition-colors">
                          <td className="px-4 py-4 text-sm font-bold text-[var(--admin-600)]">{user.studentNumber ?? '-'}</td>
                          <td className="px-4 py-4 text-sm font-medium text-[var(--foreground)]">{user.name}</td>
                          <td className="px-4 py-4 text-sm text-[var(--muted)]">{user.email}</td>
                          <td className="px-4 py-4 text-sm text-[var(--muted)]">{new Date(user.createdAt).toLocaleDateString("ja-JP")}</td>
                          <td className="px-4 py-4 text-sm">
                            {editingUserId === user.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={studentNumberDraft}
                                  onChange={(e) => setStudentNumberDraft(e.target.value)}
                                  className="w-24"
                                  placeholder="未設定"
                                />
                                <button
                                  onClick={() => saveStudentNumber(user.id)}
                                  disabled={savingUserId === user.id}
                                  className="rounded-lg bg-[var(--admin-600)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {savingUserId === user.id ? "保存中" : "保存"}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                                >
                                  キャンセル
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(user)}
                                className="text-xs font-medium text-[var(--admin-600)] hover:underline"
                              >
                                変更
                              </button>
                            )}
                          </td>
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
