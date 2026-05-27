"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
};

type Lesson = {
  id: string;
  dayOfWeek: string;
  period: number;
  subject: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
};

type DashboardData = {
  tasks: Task[];
  announcements: Announcement[];
  lessons?: Lesson[];
};

const DAYS = ["月", "火", "水", "木", "金"];
const PERIODS = [1, 2, 3, 4];

// 管理ページと同じ色マップ
const SUBJECT_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  1: { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  2: { bg: "#fef9c3", text: "#a16207", border: "#fde047" },
  3: { bg: "#fce7f3", text: "#be185d", border: "#f9a8d4" },
  4: { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd" },
  5: { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  6: { bg: "#cffafe", text: "#0e7490", border: "#67e8f9" },
  7: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({ tasks: [], announcements: [], lessons: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          if (res.status === 401) { router.push("/login"); return; }
          throw new Error("データの取得に失敗しました。");
        }
        setData((await res.json()) as DashboardData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      alert("ログアウトに失敗しました。");
    }
  };

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCompleted: !isCompleted }),
    });
    if (!res.ok) { alert("更新に失敗しました。"); return; }
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, isCompleted: !isCompleted } : task
      ),
    }));
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">データを読み込み中...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const incompleteTasks = data.tasks.filter((t) => !t.isCompleted);

  // 教科ごとに色を割り当て（登場順）
  const subjectColorIndex: Record<string, number> = {};
  let colorIdx = 0;
  (data.lessons ?? []).forEach((l) => {
    if (!(l.subject in subjectColorIndex)) {
      subjectColorIndex[l.subject] = colorIdx++ % 8;
    }
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="container-responsive py-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--foreground)]">ダッシュボード</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-[var(--card)] border text-[var(--muted)] text-sm font-medium rounded-xl shadow-sm transition"
            style={{ borderColor: "var(--border)" }}
          >
            ログアウト
          </button>
        </div>

        {/* お知らせバー */}
        {data.announcements.length > 0 && (
          <div className="info-bar">{data.announcements[0].title} — {data.announcements[0].body}</div>
        )}

        {/* 時間割（全幅テーブル） */}
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">時間割</h2>
          <table className="w-full table-fixed text-sm min-w-[480px]">
            <thead>
              <tr style={{ backgroundColor: "var(--primary-50)" }}>
                <th className="w-14 py-2 px-3 text-xs font-bold text-[var(--primary)] text-center rounded-tl-xl">時限</th>
                {DAYS.map((d, i) => (
                  <th key={d} className={`py-2 px-3 text-xs font-bold text-[var(--primary)] text-center ${i === 4 ? "rounded-tr-xl" : ""}`}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2 px-3 text-xs font-semibold text-center text-[var(--muted)]">{period}限</td>
                  {DAYS.map((day) => {
                    const lesson = data.lessons?.find((l) => l.dayOfWeek === day && l.period === period);
                    const c = lesson ? SUBJECT_COLORS[subjectColorIndex[lesson.subject] ?? 0] : null;
                    return (
                      <td key={day} className="py-1.5 px-1.5">
                        {lesson && c ? (
                          <div
                            className="rounded-xl py-2 px-2 text-xs font-semibold text-center border"
                            style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
                          >
                            {lesson.subject}
                          </div>
                        ) : (
                          <div className="rounded-xl py-2 px-2 text-xs text-center text-[var(--muted)] opacity-30">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 課題・連絡 2カラム */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 課題 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--foreground)]">課題の状況</h2>
              <span className="text-sm text-[var(--muted)]">未完了 {incompleteTasks.length} / 全 {data.tasks.length}</span>
            </div>
            <div className="space-y-3">
              {data.tasks.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">現在登録されている課題はありません。</p>
              ) : (
                data.tasks.map((task) => (
                  <div key={task.id} className={`task-item ${task.isCompleted ? "task-complete" : ""}`}>
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => handleToggleTask(task.id, task.isCompleted)}
                      className="task-checkbox"
                      aria-label={`完了: ${task.title}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${task.isCompleted ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
                        【{task.subject}】{task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">締切: {new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleToggleTask(task.id, task.isCompleted)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium ${task.isCompleted ? "bg-[var(--background)] text-[var(--muted)] border" : "bg-[var(--primary)] text-white"}`}
                      style={task.isCompleted ? { borderColor: "var(--border)" } : {}}
                    >
                      {task.isCompleted ? "戻す" : "完了"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 連絡 */}
          <div className="card">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">日々の連絡</h2>
            <div className="space-y-3">
              {data.announcements.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">現在表示できる連絡はありません。</p>
              ) : (
                data.announcements.map((a) => (
                  <article key={a.id} className="rounded-2xl p-3 border" style={{ borderColor: "var(--border)", backgroundColor: "var(--primary-50)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{a.title}</h3>
                      <span className="shrink-0 text-xs text-[var(--muted)]">{new Date(a.date).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">{a.body}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
