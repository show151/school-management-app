"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnnouncementBody } from "@/components/AnnouncementBody";
import { markdownToHtml } from "@/lib/markdown";

type Task = { id: string; subject: string; title: string; dueDate: string; isCompleted: boolean };
type Lesson = { id: string; dayOfWeek: string; period: number; subject: string };
type Announcement = { id: string; title: string; body: string; date: string };
type Test = { id: string; subject: string; period: number; range: string; testDate: string; note?: string | null };
type DailyLink = { id: string; label: string; description: string | null; href: string; sortOrder: number };

type DashboardData = {
  tasks: Task[];
  announcements: Announcement[];
  lessons?: Lesson[];
  tests?: Test[];
  readIds?: string[];
  dailyLinks?: DailyLink[];
};

const DAYS = ["月", "火", "水", "木", "金"];
const PERIODS = [1, 2, 3, 4];

const COLORS = [
  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  { bg: "#fef9c3", text: "#a16207", border: "#fde047" },
  { bg: "#fce7f3", text: "#be185d", border: "#f9a8d4" },
  { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd" },
  { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  { bg: "#cffafe", text: "#0e7490", border: "#67e8f9" },
  { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
];

function getDaysUntil(dateStr: string) {
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function UrgencyBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil < 0) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">期限切れ</span>;
  if (daysUntil === 0) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">今日</span>;
  if (daysUntil === 1) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">明日</span>;
  if (daysUntil <= 3) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">あと{daysUntil}日</span>;
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({ tasks: [], announcements: [], lessons: [], tests: [], readIds: [], dailyLinks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (res.status === 401) { router.push("/login"); return; }
        if (!res.ok) throw new Error("データの取得に失敗しました。");
        const json = await res.json() as DashboardData;
        setData(json);
        setReadIds(new Set(json.readIds ?? []));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    // Force a full reload so server-rendered Header sees cookie changes
    window.location.href = "/";
  };

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCompleted: !isCompleted }),
    });
    if (!res.ok) { alert("更新に失敗しました。"); return; }
    setData((cur) => ({ ...cur, tasks: cur.tasks.map((t) => t.id === id ? { ...t, isCompleted: !isCompleted } : t) }));
  };

  const handleMarkRead = async (announcementId: string) => {
    if (readIds.has(announcementId)) return;
    await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementId }),
    });
    setReadIds((prev) => new Set([...prev, announcementId]));
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">データを読み込み中...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const todayDay = ["日", "月", "火", "水", "木", "金", "土"][new Date().getDay()];
  const incompleteTasks = data.tasks.filter((t) => !t.isCompleted);
  const completedCount = data.tasks.filter((t) => t.isCompleted).length;
  const progressPct = data.tasks.length > 0 ? Math.round((completedCount / data.tasks.length) * 100) : 0;
  const unreadCount = data.announcements.filter((a) => !readIds.has(a.id)).length;
  const upcomingTests = (data.tests ?? []).filter((t) => new Date(t.testDate) >= new Date()).slice(0, 5);

  // 教科カラーマップ
  const subjectColorMap: Record<string, typeof COLORS[0]> = {};
  let ci = 0;
  [...(data.lessons ?? []), ...(data.tests ?? [])].forEach((item) => {
    if (!(item.subject in subjectColorMap)) subjectColorMap[item.subject] = COLORS[ci++ % 8];
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="container-responsive py-6 space-y-6">

        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[var(--foreground)]">ダッシュボード</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/settings")}
              className="px-3 py-1.5 bg-[var(--card)] border text-[var(--muted)] text-sm font-medium rounded-xl shadow-sm transition hover:text-[var(--foreground)]"
              style={{ borderColor: "var(--border)" }}
            >
              設定
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-[var(--card)] border text-[var(--muted)] text-sm font-medium rounded-xl shadow-sm transition"
              style={{ borderColor: "var(--border)" }}
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* お知らせバー（未読のみ） */}
        {data.announcements.filter((a) => !readIds.has(a.id)).slice(0, 1).map((a) => (
          <div key={a.id} className="card flex flex-col items-start gap-3 sm:flex-row sm:gap-4"
            style={{ borderLeft: "4px solid var(--accent)", backgroundColor: "var(--accent-bg)" }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>お知らせ</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(a.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{a.title}</p>
              <AnnouncementBody body={a.body} className="mt-1" />
            </div>
            <button
              onClick={() => handleMarkRead(a.id)}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
              style={{ backgroundColor: "var(--card)", color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              既読
            </button>
          </div>
        ))}

        {/* 普段使うリンク */}
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-[var(--foreground)]">普段使うリンク</h2>
            <span className="text-xs text-[var(--muted)]">よく開くページ</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(data.dailyLinks ?? []).map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border p-3 transition-colors hover:bg-[var(--primary-50)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">{link.label}</p>
                {link.description && <p className="mt-1 text-xs text-[var(--muted)]">{link.description}</p>}
              </a>
            ))}
            {(data.dailyLinks ?? []).length === 0 && (
              <p className="text-sm text-[var(--muted)]">管理者がリンクを登録すると、ここに表示されます。</p>
            )}
          </div>
        </div>

        {/* 時間割（全幅・今日ハイライト） */}
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">時間割</h2>
          <table className="w-full table-fixed text-sm min-w-[480px]">
            <thead>
              <tr>
                <th className="w-14 py-2 px-3 text-xs font-bold text-center rounded-tl-xl" style={{ backgroundColor: "var(--primary-50)", color: "var(--primary)" }}>時限</th>
                {DAYS.map((d, i) => {
                  const isToday = d === todayDay;
                  return (
                    <th key={d} className={`py-2 px-3 text-xs font-bold text-center ${i === 4 ? "rounded-tr-xl" : ""}`}
                      style={{ backgroundColor: isToday ? "var(--primary)" : "var(--primary-50)", color: isToday ? "#fff" : "var(--primary)" }}>
                      {d}{isToday && <span className="ml-1 text-[10px] opacity-80">今日</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2 px-3 text-xs font-semibold text-center text-[var(--muted)]">{period}限</td>
                  {DAYS.map((day) => {
                    const dayLessons = data.lessons?.filter((l) => l.dayOfWeek === day && l.period === period) ?? [];
                    const isToday = day === todayDay;
                    return (
                      <td key={day} className="py-1.5 px-1.5" style={isToday ? { backgroundColor: "rgba(79,70,229,0.04)" } : {}}>
                        <div className="flex flex-col gap-1 min-h-[36px]">
                          {dayLessons.length === 0 ? (
                            <div className="rounded-xl py-2 px-2 text-xs text-center text-[var(--muted)] opacity-30">—</div>
                          ) : (
                            dayLessons.map((lesson) => {
                              const c = subjectColorMap[lesson.subject];
                              return c ? (
                                <div key={lesson.id} className="rounded-xl py-1.5 px-2 text-xs font-semibold text-center border"
                                  style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}>
                                  {lesson.subject}
                                </div>
                              ) : null;
                            })
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 課題・テスト 2カラム */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 課題 */}
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[var(--foreground)]">課題の状況</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--muted)]">未完了 {incompleteTasks.length} / 全 {data.tasks.length}</span>
                <button onClick={() => router.push("/dashboard/tasks")} className="text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors" style={{ borderColor: "var(--border)", color: "var(--muted)", backgroundColor: "var(--card)" }}>すべて見る →</button>
              </div>
            </div>

            {/* 進捗バー */}
            {data.tasks.length > 0 && (
              <div>
                <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                  <span>完了率</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                  <div className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, backgroundColor: progressPct === 100 ? "#15803d" : "var(--primary)" }} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              {data.tasks.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">現在登録されている課題はありません。</p>
              ) : (
                data.tasks.map((task) => {
                  const days = getDaysUntil(task.dueDate);
                  return (
                    <div key={task.id} className={`task-item ${task.isCompleted ? "task-complete" : ""}`}>
                      <input type="checkbox" checked={task.isCompleted}
                        onChange={() => handleToggleTask(task.id, task.isCompleted)}
                        className="task-checkbox" aria-label={`完了: ${task.title}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold ${task.isCompleted ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
                            【{task.subject}】{task.title}
                          </p>
                          {!task.isCompleted && <UrgencyBadge daysUntil={days} />}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">締切: {new Date(task.dueDate).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => handleToggleTask(task.id, task.isCompleted)}
                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium ${task.isCompleted ? "bg-[var(--background)] text-[var(--muted)] border" : "bg-[var(--primary)] text-white"}`}
                        style={task.isCompleted ? { borderColor: "var(--border)" } : {}}>
                        {task.isCompleted ? "戻す" : "完了"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* テスト */}
          <div className="card">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">テスト予定</h2>
            <div className="space-y-2">
              {upcomingTests.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">予定されているテストはありません。</p>
              ) : (
                upcomingTests.map((test) => {
                  const days = getDaysUntil(test.testDate);
                  const c = subjectColorMap[test.subject] ?? COLORS[0];
                  const isExpanded = expandedTestId === test.id;
                  return (
                    <div key={test.id} className="rounded-2xl border p-3"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl px-2 py-1 text-xs font-bold shrink-0 border"
                          style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}>
                          {test.subject}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-[var(--foreground)]">{test.period}時限</p>
                            <UrgencyBadge daysUntil={days} />
                          </div>
                          <p className="text-xs text-[var(--muted)] mt-0.5">範囲: {test.range}</p>
                          <p className="text-xs text-[var(--muted)]">{new Date(test.testDate).toLocaleString("ja-JP")}</p>
                          <button
                            type="button"
                            onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                            className="mt-1 text-xs font-medium text-[var(--primary)] hover:underline"
                          >
                            {isExpanded ? "詳細を閉じる" : "詳細を見る"}
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 border-t pt-3 text-xs text-[var(--muted)]" style={{ borderColor: "var(--border)" }}>
                          <p className="mb-1"><span className="font-semibold text-[var(--foreground)]">範囲:</span> {test.range}</p>
                          <p className="mb-2"><span className="font-semibold text-[var(--foreground)]">日時:</span> {new Date(test.testDate).toLocaleString("ja-JP")}</p>
                          {test.note ? (
                            <div>
                              <p className="font-semibold text-[var(--foreground)] mb-1">特記事項</p>
                              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(test.note) }} />
                            </div>
                          ) : (
                            <p>特記事項はありません。</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 連絡（既読管理） */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-[var(--foreground)]">日々の連絡</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
                未読 {unreadCount}
              </span>
            )}
            <button onClick={() => router.push("/dashboard/announcements")} className="ml-auto text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors" style={{ borderColor: "var(--border)", color: "var(--muted)", backgroundColor: "var(--card)" }}>すべて見る →</button>
          </div>
          <div className="space-y-3">
            {data.announcements.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">現在表示できる連絡はありません。</p>
            ) : (
              data.announcements.map((a) => {
                const isRead = readIds.has(a.id);
                return (
                  <article key={a.id}
                    className="rounded-2xl p-3 border transition-opacity"
                    style={{ borderColor: "var(--border)", backgroundColor: isRead ? "var(--background)" : "var(--primary-50)" }}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!isRead && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--accent)" }} />}
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">{a.title}</h3>
                        </div>
                        <AnnouncementBody body={a.body} muted={isRead} className="mt-1" />
                      </div>
                      <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-1 sm:shrink-0">
                        <span className="text-xs text-[var(--muted)]">{new Date(a.date).toLocaleDateString()}</span>
                        {!isRead && (
                          <button onClick={() => handleMarkRead(a.id)}
                            className="text-xs text-[var(--primary)] hover:underline">
                            既読にする
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
