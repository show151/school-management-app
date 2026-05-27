"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Task = { id: string; subject: string; title: string; dueDate: string; isCompleted: boolean };

function getDaysUntil(dateStr: string) {
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function UrgencyBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil < 0)  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">期限切れ</span>;
  if (daysUntil === 0) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">今日</span>;
  if (daysUntil === 1) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">明日</span>;
  if (daysUntil <= 3)  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">あと{daysUntil}日</span>;
  return null;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "incomplete" | "completed">("incomplete");

  useEffect(() => {
    fetch("/api/tasks")
      .then(async (res) => {
        if (res.status === 401) { router.push("/login"); return; }
        setTasks(await res.json());
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleToggle = async (id: string, isCompleted: boolean) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCompleted: !isCompleted }),
    });
    if (!res.ok) { alert("更新に失敗しました。"); return; }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, isCompleted: !isCompleted } : t));
  };

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filtered = tasks.filter((t) => {
    if (filter === "incomplete") return !t.isCompleted;
    if (filter === "completed") return t.isCompleted;
    return true;
  });

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="container-responsive py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            ← ダッシュボード
          </button>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--foreground)]">課題一覧</h1>
            <span className="text-sm text-[var(--muted)]">未完了 {tasks.filter(t => !t.isCompleted).length} / 全 {tasks.length}</span>
          </div>
          <div className="flex rounded-xl border overflow-hidden text-sm" style={{ borderColor: "var(--border)" }}>
            {(["incomplete", "all", "completed"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 font-medium transition-colors"
                style={{
                  backgroundColor: filter === f ? "var(--primary)" : "var(--card)",
                  color: filter === f ? "#fff" : "var(--muted)",
                }}>
                {f === "incomplete" ? "未完了" : f === "completed" ? "完了済み" : "すべて"}
              </button>
            ))}
          </div>
        </div>

        {/* 進捗バー */}
        {tasks.length > 0 && (
          <div className="card">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-[var(--foreground)]">完了率</span>
              <span className="font-bold" style={{ color: progressPct === 100 ? "#15803d" : "var(--primary)" }}>{progressPct}%</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
              <div className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: progressPct === 100 ? "#15803d" : "var(--primary)" }} />
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">{completedCount} / {tasks.length} 件完了</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="card text-center text-[var(--muted)] py-10">
              {filter === "incomplete" ? "未完了の課題はありません。" : filter === "completed" ? "完了済みの課題はありません。" : "課題はありません。"}
            </div>
          ) : (
            filtered.map((task) => {
              const days = getDaysUntil(task.dueDate);
              return (
                <div key={task.id} className={`task-item ${task.isCompleted ? "task-complete" : ""}`}>
                  <input type="checkbox" checked={task.isCompleted}
                    onChange={() => handleToggle(task.id, task.isCompleted)}
                    className="task-checkbox" aria-label={`完了: ${task.title}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: "var(--primary-50)", color: "var(--primary)" }}>
                        {task.subject}
                      </span>
                      {!task.isCompleted && <UrgencyBadge daysUntil={days} />}
                    </div>
                    <p className={`text-sm font-semibold mt-1 ${task.isCompleted ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">締切: {new Date(task.dueDate).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => handleToggle(task.id, task.isCompleted)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${task.isCompleted ? "border" : "bg-[var(--primary)] text-white"}`}
                    style={task.isCompleted ? { borderColor: "var(--border)", color: "var(--muted)", backgroundColor: "var(--background)" } : {}}>
                    {task.isCompleted ? "戻す" : "完了"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
