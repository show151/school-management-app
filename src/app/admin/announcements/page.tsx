"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Announcement = { id: string; title: string; body: string; date: string };
type User = { id: string; name: string; email: string; createdAt: string };

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [titleError, setTitleError] = useState("");
  const [bodyError, setBodyError] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const reload = async () => {
    const res = await fetch("/api/admin/announcements");
    if (!res.ok) { router.push("/admin/login"); return; }
    setAnnouncements((await res.json()) as Announcement[]);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetch("/api/admin/announcements"), fetch("/api/admin/users")])
      .then((res) => {
        if (!res[0].ok || !res[1].ok) throw new Error();
        return Promise.all([res[0].json(), res[1].json()]);
      })
      .then(([announcementsData, usersData]) => {
        if (isMounted) {
          setAnnouncements(announcementsData as Announcement[]);
          setUsers(usersData as User[]);
        }
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(""); setBodyError("");
    if (!title.trim()) setTitleError("件名を入力してください。");
    if (!body.trim()) setBodyError("本文を入力してください。");
    if (!title.trim() || !body.trim()) return;

    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, date }),
    });
    if (!res.ok) { alert("連絡の登録に失敗しました。"); return; }

    if (selectedUserIds.length > 0) {
      const emailRes = await fetch("/api/admin/send-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "announcement", userIds: selectedUserIds, payload: { title, body } }),
      });
      if (!emailRes.ok) {
        const error = await emailRes.json().catch(() => ({ error: "Unknown error" }));
        alert(`メール送信に失敗しました: ${error.error}`);
      }
    }

    setTitle(""); setBody(""); setSelectedUserIds([]);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この連絡を削除しますか？")) return;
    const res = await fetch("/api/admin/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { alert("連絡の削除に失敗しました。"); return; }
    reload();
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
          <button onClick={() => router.push("/admin")} className="text-sm font-medium admin-link md:hidden">
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">日々の連絡</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card h-fit lg:col-span-1">
            <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">新しい連絡を登録</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">日付</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">件名</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 明日の持ち物" />
                {titleError && <small className="text-xs text-red-600 mt-1 block">{titleError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">本文</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-20" placeholder="連絡内容を入力" />
                {bodyError && <small className="text-xs text-red-600 mt-1 block">{bodyError}</small>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  送信するユーザー
                  {selectedUserIds.length > 0 && <span className="ml-2 admin-pill">{selectedUserIds.length}人</span>}
                </label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
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
                <button type="submit" className="w-full admin-btn">登録 + メール送信</button>
              </div>
            </form>
          </div>

          <div className="card lg:col-span-2">
            <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">連絡一覧</h2>
            {announcements.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">まだ連絡が登録されていません。</p>
            ) : (
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <article key={announcement.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-[var(--muted)]">{new Date(announcement.date).toLocaleDateString()}</p>
                        <h3 className="mt-1 text-sm font-bold text-[var(--foreground)]">{announcement.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{announcement.body}</p>
                      </div>
                      <button onClick={() => handleDelete(announcement.id)} className="text-xs font-medium text-red-500 hover:text-red-700">削除</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
