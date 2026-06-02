"use client";

import { useEffect, useState } from "react";
import { markdownToHtml } from '@/lib/markdown';
import { sendAdminEmail } from "@/lib/send-admin-email";
import { useRouter } from "next/navigation";

type Announcement = { id: string; title: string; body: string; date: string };
type User = { id: string; studentNumber?: number | null; name: string; email: string; createdAt: string };
type SendType = 'announcement' | 'test';

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendType, setSendType] = useState<SendType>('announcement');
  const [testRange, setTestRange] = useState('');
  const [testDateInput, setTestDateInput] = useState('');
  const [testNote, setTestNote] = useState('');
  const [studentNumberFrom, setStudentNumberFrom] = useState('');
  const [studentNumberTo, setStudentNumberTo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [titleError, setTitleError] = useState("");
  const [bodyError, setBodyError] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const reload = async () => {
    const res = await fetch("/api/admin/announcements", { credentials: "same-origin" });
    if (!res.ok) { router.push("/"); return; }
    setAnnouncements((await res.json()) as Announcement[]);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetch("/api/admin/announcements", { credentials: "same-origin" }), fetch("/api/admin/users", { credentials: "same-origin" })])
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
      .catch(() => router.push("/"))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(""); setBodyError("");
    if (sendType === 'announcement') {
      if (!title.trim()) setTitleError("件名を入力してください。");
      if (!body.trim()) setBodyError("本文を入力してください。");
      if (!title.trim() || !body.trim()) return;
    } else {
      // test
      if (!title.trim()) setTitleError("教科名を入力してください。");
      if (!testRange.trim()) setBodyError("範囲を入力してください。");
      if (!testDateInput) setBodyError("テスト日時を入力してください。");
      if (!title.trim() || !testRange.trim() || !testDateInput) return;
    }

    if (sendType === 'announcement') {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, date }),
      });
      if (!res.ok) { alert("連絡の登録に失敗しました。"); return; }
    }

    const emailResult = await sendAdminEmail({
      type: sendType === "announcement" ? "announcement" : "test",
      selectedUserIds,
      studentNumberFrom,
      studentNumberTo,
      payload:
        sendType === "announcement"
          ? { title, body }
          : { subject: title, testDate: testDateInput, range: testRange, note: testNote },
    });
    if (!emailResult.ok) {
      alert(
        sendType === "announcement"
          ? `メール送信に失敗しました: ${emailResult.error}`
          : `テスト連絡のメール送信に失敗しました: ${emailResult.error}`
      );
    }

    setTitle(""); setBody(""); setSelectedUserIds([]);
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

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
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
                <select value={sendType} onChange={(e) => setSendType(e.target.value === 'test' ? 'test' : 'announcement')} className="mt-1 block w-full rounded px-3 py-2 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                  <option value="announcement">お知らせ</option>
                  <option value="test">テスト連絡</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">件名 / 教科</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={sendType === 'announcement' ? '例: 明日の持ち物' : '例: 数学'} />
                {titleError && <small className="text-xs text-red-600 mt-1 block">{titleError}</small>}
              </div>

              {sendType === 'announcement' ? (
                <>
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
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">範囲</label>
                    <input value={testRange} onChange={(e) => setTestRange(e.target.value)} placeholder="例: 第1章～第3章" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">特記事項（任意・Markdown可）</label>
                    <textarea value={testNote} onChange={(e) => setTestNote(e.target.value)} className="min-h-16" placeholder="例: 持ち物: 筆記用具\n備考: 追加の注意" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">テスト日時</label>
                    <input type="datetime-local" value={testDateInput} onChange={(e) => setTestDateInput(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">出席番号範囲（任意）</label>
                    <div className="flex gap-2">
                      <input type="number" min="1" value={studentNumberFrom} onChange={(e) => setStudentNumberFrom(e.target.value)} placeholder="From" className="w-1/2" />
                      <input type="number" min="1" value={studentNumberTo} onChange={(e) => setStudentNumberTo(e.target.value)} placeholder="To" className="w-1/2" />
                    </div>
                  </div>
                </>
              )}

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
                      <label key={user.id} className={`flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--admin-50)]`}>
                        <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleUserSelection(user.id)} className="cursor-pointer" />
                        <p className="text-xs font-medium text-[var(--foreground)]">{user.studentNumber ? `(${user.studentNumber}) ` : ''}{user.name}</p>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* 全員へ送信オプションは不要のため削除 */}

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
                        <h3 className="mt-1 text-sm font-bold text-[var(--foreground)]">{announcement.title}</h3>
                        <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]" dangerouslySetInnerHTML={{ __html: markdownToHtml(announcement.body) }} />
                      </div>
                      <button onClick={() => handleDelete(announcement.id)} className="self-start text-xs font-medium text-red-500 hover:text-red-700 sm:self-auto">削除</button>
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
