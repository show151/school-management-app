"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
};

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

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

    fetch("/api/admin/announcements")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<Announcement[]>;
      })
      .then((data) => {
        if (isMounted) setAnnouncements(data);
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

    setTitle("");
    setBody("");
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

  if (loading) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">日々の連絡</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">件名</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
              placeholder="例: 明日の持ち物"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">本文</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-28 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
              placeholder="連絡内容を入力"
            />
          </div>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            登録
          </button>
        </form>

        <div className="space-y-3">
          {announcements.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
              まだ連絡が登録されていません。
            </p>
          ) : (
            announcements.map((announcement) => (
              <article key={announcement.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{new Date(announcement.date).toLocaleDateString()}</p>
                    <h2 className="mt-1 text-base font-bold text-gray-900">{announcement.title}</h2>
                  </div>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{announcement.body}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
