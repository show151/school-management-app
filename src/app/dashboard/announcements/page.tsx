"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnnouncementBody } from "@/components/AnnouncementBody";

type Announcement = { id: string; title: string; body: string; date: string; announcementType: string };

export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "announcement" | "test">("all");

  useEffect(() => {
    fetch("/api/announcements")
      .then(async (res) => {
        if (res.status === 401) { router.push("/login"); return; }
        const json = await res.json();
        setAnnouncements(json.announcements ?? []);
        setReadIds(new Set(json.readIds ?? []));
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleMarkRead = async (id: string) => {
    if (readIds.has(id)) return;
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementId: id }),
    });
    setReadIds((prev) => new Set([...prev, id]));
  };

  const handleMarkAllRead = async () => {
    const unread = announcements.filter((a) => !readIds.has(a.id));
    await Promise.all(unread.map((a) => fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementId: a.id }),
    })));
    setReadIds(new Set(announcements.map((a) => a.id)));
  };

  const filtered = filter === "unread" ? announcements.filter((a) => !readIds.has(a.id)) :
                   filter === "announcement" ? announcements.filter((a) => a.announcementType === "announcement") :
                   filter === "test" ? announcements.filter((a) => a.announcementType === "test") :
                   announcements;
  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="container-responsive py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            ← ダッシュボード
          </button>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--foreground)]">連絡一覧</h1>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
                未読 {unreadCount}
              </span>
            )}
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <div className="flex rounded-xl border overflow-hidden text-sm" style={{ borderColor: "var(--border)" }}>
              {(["all", "unread", "announcement", "test"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 font-medium transition-colors"
                  style={{
                    backgroundColor: filter === f ? "var(--primary)" : "var(--card)",
                    color: filter === f ? "#fff" : "var(--muted)",
                  }}>
                  {f === "all" ? "すべて" : f === "unread" ? "未読のみ" : f === "announcement" ? "お知らせ" : "テスト連絡"}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}
                className="text-sm px-3 py-1.5 rounded-xl border font-medium transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--muted)", backgroundColor: "var(--card)" }}>
                すべて既読
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="card text-center text-[var(--muted)] py-10">
              {filter === "unread" ? "未読の連絡はありません。" : "連絡はありません。"}
            </div>
          ) : (
            filtered.map((a) => {
              const isRead = readIds.has(a.id);
              return (
                <article key={a.id} className="card"
                  style={{ borderLeft: isRead ? undefined : "4px solid var(--accent)", backgroundColor: isRead ? "var(--card)" : "var(--accent-bg)" }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!isRead && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--accent)" }} />}
                        {a.announcementType === "test" ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">テスト連絡</span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>お知らせ</span>
                        )}
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(a.date).toLocaleDateString()}</span>
                      </div>
                      <h2 className="text-sm font-bold text-[var(--foreground)]">{a.title}</h2>
                      <AnnouncementBody body={a.body} className="mt-1" />
                    </div>
                    {!isRead && (
                      <button onClick={() => handleMarkRead(a.id)}
                        className="self-start shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors sm:self-auto"
                        style={{ borderColor: "var(--border)", color: "var(--muted)", backgroundColor: "var(--card)" }}>
                        既読
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
