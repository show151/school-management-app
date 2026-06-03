"use client";

import { useEffect, useState } from "react";
import { markdownToHtml } from '@/lib/markdown';
import { sendAdminEmail } from "@/lib/send-admin-email";
import { formatSchedulePeriod, type TestScheduleDto } from "@/lib/test-schedule";
import { useRouter } from "next/navigation";

type Announcement = { id: string; title: string; body: string; date: string; announcementType: string };
type User = { id: string; studentNumber?: number | null; name: string; email: string; createdAt: string };
type SendType = 'announcement' | 'test';

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [testSchedules, setTestSchedules] = useState<TestScheduleDto[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendType, setSendType] = useState<SendType>('announcement');
  const [studentNumberFrom, setStudentNumberFrom] = useState('');
  const [studentNumberTo, setStudentNumberTo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [titleError, setTitleError] = useState("");
  const [bodyError, setBodyError] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 編集用state
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editUserIds, setEditUserIds] = useState<string[]>([]);

  // 再送信用state
  const [resendAnnTarget, setResendAnnTarget] = useState<Announcement | null>(null);
  const [resendAnnUserIds, setResendAnnUserIds] = useState<string[]>([]);
  const [resendAnnLoading, setResendAnnLoading] = useState(false);

  const reload = async () => {
    const res = await fetch("/api/admin/announcements", { credentials: "same-origin" });
    if (!res.ok) { router.push("/"); return; }
    setAnnouncements((await res.json()) as Announcement[]);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch("/api/admin/announcements", { credentials: "same-origin" }),
      fetch("/api/admin/users", { credentials: "same-origin" }),
      fetch("/api/admin/test-schedules", { credentials: "same-origin" }),
    ])
      .then((res) => {
        if (!res[0].ok || !res[1].ok || !res[2].ok) throw new Error();
        return Promise.all([res[0].json(), res[1].json(), res[2].json()]);
      })
      .then(([announcementsData, usersData, schedulesData]) => {
        if (isMounted) {
          setAnnouncements(announcementsData as Announcement[]);
          setUsers(usersData as User[]);
          setTestSchedules(schedulesData as TestScheduleDto[]);
        }
      })
      .catch(() => router.push("/"))
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
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, body: body, date, announcementType: sendType }),
    });
    if (!res.ok) { alert("連絡の登録に失敗しました。"); return; }

    const emailResult = await sendAdminEmail({
      type: "announcement",
      selectedUserIds,
      studentNumberFrom,
      studentNumberTo,
      payload: { title, body },
    });
    if (!emailResult.ok) {
      alert(`メール送信に失敗しました: ${emailResult.error}`);
    }

    setTitle(""); setBody(""); setSelectedUserIds([]);
    reload();
  };

  const handleEdit = (a: Announcement) => {
    setEditTarget(a);
    setEditTitle(a.title);
    setEditBody(a.body);
    setEditDate(a.date.slice(0, 10));
    setEditUserIds([]);
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editTitle.trim() || !editBody.trim()) return;
    const res = await fetch("/api/admin/announcements", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editTarget.id, title: editTitle, body: editBody, date: editDate, announcementType: editTarget.announcementType }),
    });
    if (!res.ok) { alert("更新に失敗しました。"); return; }

    if (editUserIds.length > 0) {
      const emailResult = await sendAdminEmail({
        type: "announcementUpdate",
        selectedUserIds: editUserIds,
        studentNumberFrom: "",
        studentNumberTo: "",
        payload: { title: editTitle, body: editBody },
      });
      if (!emailResult.ok) alert(`更新通知メールの送信に失敗しました: ${emailResult.error}`);
    }

    setEditTarget(null);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この連絡を削除しますか？")) return;
    const res = await fetch("/api/admin/announcements", {
      method: "DELETE",
      credentials: "same-origin",
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

  const handleResendAnnouncement = async () => {
    if (!resendAnnTarget || resendAnnUserIds.length === 0) return;
    setResendAnnLoading(true);
    const emailResult = await sendAdminEmail({
      type: "announcement",
      selectedUserIds: resendAnnUserIds,
      studentNumberFrom: "",
      studentNumberTo: "",
      payload: { title: resendAnnTarget.title, body: resendAnnTarget.body },
    });
    setResendAnnLoading(false);
    if (!emailResult.ok) {
      alert(`再送信に失敗しました: ${emailResult.error}`);
    } else {
      alert(`${resendAnnUserIds.length}人に再送信しました。`);
    }
    setResendAnnTarget(null);
    setResendAnnUserIds([]);
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      {/* 再送信モーダル */}
      {resendAnnTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => { setResendAnnTarget(null); setResendAnnUserIds([]); }}
          role="presentation"
        >
          <div className="card w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 className="text-base font-bold text-[var(--foreground)]">連絡を再送信</h3>
            <p className="text-sm font-semibold text-[var(--foreground)]">{resendAnnTarget.title}</p>
            <p className="text-xs text-[var(--muted)]">{new Date(resendAnnTarget.date).toLocaleDateString()}</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                再送信するユーザー
                {resendAnnUserIds.length > 0 && <span className="ml-2 admin-pill">{resendAnnUserIds.length}人</span>}
              </label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                {users.map((user) => (
                  <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--admin-50)]">
                    <input type="checkbox" checked={resendAnnUserIds.includes(user.id)} onChange={() => setResendAnnUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} />
                    <span className="text-xs">{user.studentNumber ? `(${user.studentNumber}) ` : ''}{user.name}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setResendAnnUserIds(users.map(u => u.id))} className="mt-2 w-full admin-outline">すべて選択</button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleResendAnnouncement} disabled={resendAnnUserIds.length === 0 || resendAnnLoading} className="flex-1 admin-btn disabled:opacity-50">
                {resendAnnLoading ? "送信中..." : `再送信 (${resendAnnUserIds.length}人)`}
              </button>
              <button type="button" onClick={() => { setResendAnnTarget(null); setResendAnnUserIds([]); }} className="text-xs text-[var(--muted)] px-3">キャンセル</button>
            </div>
          </div>
        </div>
      )}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setEditTarget(null)}
          role="presentation"
        >
          <div className="card w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 className="text-base font-bold text-[var(--foreground)]">連絡を編集</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">日付</label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">件名</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">本文</label>
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="min-h-24" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                更新を通知するユーザー（任意）
                {editUserIds.length > 0 && <span className="ml-2 admin-pill">{editUserIds.length}人</span>}
              </label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                {users.map((user) => (
                  <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--admin-50)]">
                    <input type="checkbox" checked={editUserIds.includes(user.id)} onChange={() => setEditUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} />
                    <span className="text-xs">{user.studentNumber ? `(${user.studentNumber}) ` : ''}{user.name}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setEditUserIds(users.map(u => u.id))} className="mt-2 w-full admin-outline">すべて選択</button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleSaveEdit} className="flex-1 admin-btn">保存{editUserIds.length > 0 ? " + 通知" : ""}</button>
              <button type="button" onClick={() => setEditTarget(null)} className="text-xs text-[var(--muted)] px-3">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      <div className="container-responsive py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">送信種別</label>
                <select value={sendType} onChange={(e) => setSendType(e.target.value === 'test' ? 'test' : 'announcement')}>
                  <option value="announcement">お知らせ</option>
                  <option value="test">テスト連絡</option>
                </select>
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
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">出席番号範囲（任意）</label>
                <div className="flex gap-2">
                  <input type="number" min="1" value={studentNumberFrom} onChange={(e) => setStudentNumberFrom(e.target.value)} placeholder="From" className="w-1/2" />
                  <input type="number" min="1" value={studentNumberTo} onChange={(e) => setStudentNumberTo(e.target.value)} placeholder="To" className="w-1/2" />
                </div>
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
                        <p className="text-xs font-medium text-[var(--foreground)]">{user.studentNumber ? `(${user.studentNumber}) ` : ''}{user.name}</p>
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--muted)]">{new Date(announcement.date).toLocaleDateString()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {announcement.announcementType === "test" && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded text-purple-700 bg-purple-100 shrink-0">テスト連絡</span>
                          )}
                          <h3 className="text-sm font-bold text-[var(--foreground)]">{announcement.title}</h3>
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]" dangerouslySetInnerHTML={{ __html: markdownToHtml(announcement.body) }} />
                      </div>
                      <div className="flex gap-3 self-start sm:self-auto">
                        <button onClick={() => handleEdit(announcement)} className="text-xs font-medium text-[var(--admin-600)] hover:underline">編集</button>
                        <button onClick={() => { setResendAnnTarget(announcement); setResendAnnUserIds([]); }} className="text-xs font-medium text-blue-500 hover:text-blue-700">再送信</button>
                        <button onClick={() => handleDelete(announcement.id)} className="text-xs font-medium text-red-500 hover:text-red-700">削除</button>
                      </div>
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
