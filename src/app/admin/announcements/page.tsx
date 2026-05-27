"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const reload = async () => {
    const res = await fetch("/api/admin/announcements");
    if (!res.ok) {
      router.push("/admin/login");
      return;
    }
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
      .catch(() => {
        router.push("/admin/login");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, date }),
    });

    if (!res.ok) {
      alert("連絡の登録に失敗しました。");
      return;
    }

    // 選択されたユーザーにメール送信
    if (selectedUserIds.length > 0) {
      console.log("📧 Sending email to", selectedUserIds.length, "users");
      const payload = {
        type: "announcement",
        userIds: selectedUserIds,
        payload: {
          title: title,
          body: body,
        },
      };
      console.log("📤 Request payload:", JSON.stringify(payload, null, 2));

      const emailRes = await fetch("/api/admin/send-email", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (emailRes.ok) {
        const data = await emailRes.json();
        console.log("✅ Email sent:", data);
      } else {
        const error = await emailRes.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error("❌ Email send failed. Status:", emailRes.status, "Error:", error);
        const errorMsg = error.details ? `${error.error}: ${error.details}` : (error.error || 'Unknown error');
        alert(`メール送信に失敗しました: ${errorMsg}`);
      }
    }

    setTitle("");
    setBody("");
    setSelectedUserIds([]);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この連絡を削除しますか？")) return;

    const res = await fetch("/api/admin/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      alert("連絡の削除に失敗しました。");
      return;
    }

    reload();
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">日々の連絡</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 左: 新規投稿フォーム + ユーザー選択 */}
          <div className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="mb-3 text-base font-bold text-gray-800">新しい連絡を登録</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">日付</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">件名</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                  placeholder="例: 明日の持ち物"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">本文</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                  placeholder="連絡内容を入力"
                />
              </div>

              {/* ユーザー選択 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  送信するユーザー
                  {selectedUserIds.length > 0 && (
                    <span className="ml-2 inline-block rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                      {selectedUserIds.length}人
                    </span>
                  )}
                </label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50 p-2">
                  {users.length === 0 ? (
                    <p className="text-xs text-gray-400">ユーザーが登録されていません</p>
                  ) : (
                    users.map((user) => (
                      <label key={user.id} className="flex cursor-pointer items-center space-x-2 rounded px-1 py-1 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <p className="font-medium text-gray-800">{user.name}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserIds(users.map(u => u.id))}
                  className="w-full rounded-lg border border-indigo-600 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
                >
                  すべて選択
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
                >
                  登録 + メール送信
                </button>
              </div>
            </form>
          </div>

          {/* 右: 連絡一覧 */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-base font-bold text-gray-800">連絡一覧</h2>
            {announcements.length === 0 ? (
              <p className="text-sm text-gray-400">まだ連絡が登録されていません。</p>
            ) : (
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <article key={announcement.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">{new Date(announcement.date).toLocaleDateString()}</p>
                        <h3 className="mt-1 text-sm font-bold text-gray-900">{announcement.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{announcement.body}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        削除
                      </button>
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
