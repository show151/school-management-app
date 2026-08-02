"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  note?: string | null;
};

type CalendarDay = {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
};

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

// 最も緊急度の高いタスクに基づいてドットの色を決定
function getDotColor(tasks: Task[], targetDate: Date): string {
  if (tasks.length === 0) return "var(--primary)"; // デフォルトの青

  let minDaysUntil = Infinity;
  
  tasks.forEach((task) => {
    const daysUntil = getDaysUntil(task.dueDate);
    if (daysUntil < minDaysUntil) {
      minDaysUntil = daysUntil;
    }
  });

  // 期限切れまたは今日: 赤
  if (minDaysUntil <= 0) return "#dc2626"; // red-600
  // 明日: オレンジ
  if (minDaysUntil === 1) return "#ea580c"; // orange-600
  // 2-3日以内: 黄色
  if (minDaysUntil <= 3) return "#ca8a04"; // yellow-600
  // それ以上: 青
  return "#4f46e5"; // indigo-600 (var(--primary))
}

function getDaysInMonth(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = 日曜日

  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 前月の日付で埋める
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      date,
      dayOfMonth: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: false,
      tasks: [],
    });
  }

  // 当月の日付
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.getTime() === today.getTime();
    days.push({
      date,
      dayOfMonth: day,
      isCurrentMonth: true,
      isToday,
      tasks: [],
    });
  }

  // 次月の日付で42日分（6週間）に揃える
  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    days.push({
      date,
      dayOfMonth: day,
      isCurrentMonth: false,
      isToday: false,
      tasks: [],
    });
  }

  return days;
}

function formatYearMonth(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

export default function CalendarPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setTasks(data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCompleted: !isCompleted }),
    });
    if (!res.ok) {
      alert("更新に失敗しました。");
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: !isCompleted } : t)));
    
    // 選択中の日のタスクリストも更新
    if (selectedDay) {
      setSelectedDay({
        ...selectedDay,
        tasks: selectedDay.tasks.map((t) => (t.id === id ? { ...t, isCompleted: !isCompleted } : t)),
      });
    }
  };

  // 未完了タスクのみをフィルタリング
  const incompleteTasks = tasks.filter((t) => !t.isCompleted);

  // カレンダーの日付を生成
  const calendarDays = getDaysInMonth(currentYear, currentMonth);

  // 各日付にタスクを割り当てる
  calendarDays.forEach((day) => {
    day.tasks = incompleteTasks.filter((task) => {
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === day.date.getTime();
    });
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8 text-center text-[var(--muted)]">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="container-responsive py-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            ← ダッシュボード
          </button>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-[var(--foreground)]">カレンダー</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted)",
                backgroundColor: "var(--card)",
              }}
            >
              ← 前月
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              今日
            </button>
            <button
              onClick={handleNextMonth}
              className="px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted)",
                backgroundColor: "var(--card)",
              }}
            >
              次月 →
            </button>
          </div>
        </div>

        {/* 年月表示 */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            {formatYearMonth(currentYear, currentMonth)}
          </h2>
        </div>

        {/* カレンダー */}
        <div className="card">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
              <div
                key={day}
                className="text-center text-sm font-bold py-2"
                style={{
                  color: index === 0 ? "#dc2626" : index === 6 ? "#2563eb" : "var(--foreground)",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const hasIncompleteTasks = day.tasks.length > 0;
              const dotColor = getDotColor(day.tasks, day.date);
              return (
                <button
                  key={index}
                  onClick={() => hasIncompleteTasks && day.isCurrentMonth ? setSelectedDay(day) : null}
                  disabled={!hasIncompleteTasks || !day.isCurrentMonth}
                  className={`min-h-[80px] p-2 rounded-xl border transition-all ${
                    day.isToday ? "ring-2 ring-[var(--primary)]" : ""
                  } ${hasIncompleteTasks && day.isCurrentMonth ? "cursor-pointer hover:bg-[var(--primary-50)]" : "cursor-default"}`}
                  style={{
                    borderColor: day.isCurrentMonth ? "var(--border)" : "transparent",
                    backgroundColor: day.isCurrentMonth ? "var(--card)" : "var(--background)",
                    opacity: day.isCurrentMonth ? 1 : 0.5,
                  }}
                >
                  <div
                    className={`text-sm font-semibold mb-2 ${
                      day.isToday ? "text-white bg-[var(--primary)] rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""
                    }`}
                    style={{
                      color: day.isToday
                        ? "white"
                        : index % 7 === 0
                        ? "#dc2626"
                        : index % 7 === 6
                        ? "#2563eb"
                        : "var(--foreground)",
                    }}
                  >
                    {day.dayOfMonth}
                  </div>

                  {/* タスクドット表示（色は緊急度で変化） */}
                  {hasIncompleteTasks && (
                    <div className="flex justify-center items-center gap-1 flex-wrap">
                      {day.tasks.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />
                      ))}
                      {day.tasks.length > 3 && (
                        <span className="text-[10px] font-bold" style={{ color: dotColor }}>
                          +{day.tasks.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div className="card">
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-3">凡例</h3>
          <div className="space-y-2 text-sm text-[var(--muted)]">
            <p>📌 日付をタップすると、その日のタスク一覧が表示されます</p>
            <p>📌 完了したタスクは自動的に非表示になります</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#dc2626" }}></div>
                <span className="text-xs">期限切れ・今日</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ea580c" }}></div>
                <span className="text-xs">明日</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ca8a04" }}></div>
                <span className="text-xs">2〜3日以内</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#4f46e5" }}></div>
                <span className="text-xs">4日以上先</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 日付別タスク一覧モーダル */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between sticky top-0 bg-[var(--card)] pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  {selectedDay.date.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </h3>
                <p className="text-sm text-[var(--muted)] mt-1">
                  未完了タスク {selectedDay.tasks.length} 件
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {selectedDay.tasks.length === 0 ? (
                <p className="text-center text-[var(--muted)] py-8">
                  この日のタスクはありません
                </p>
              ) : (
                selectedDay.tasks.map((task) => {
                  const days = getDaysUntil(task.dueDate);
                  return (
                    <div key={task.id} className={`task-item ${task.isCompleted ? "task-complete" : ""}`}>
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={() => handleToggleTask(task.id, task.isCompleted)}
                        className="task-checkbox"
                        aria-label={`完了: ${task.title}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-sm font-semibold ${
                              task.isCompleted ? "text-[var(--muted)]" : "text-[var(--foreground)]"
                            }`}
                          >
                            【{task.subject}】{task.title}
                          </p>
                          {!task.isCompleted && <UrgencyBadge daysUntil={days} />}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          締切: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                        {task.note && (
                          <p className="mt-0.5 text-xs text-[var(--muted)] italic">
                            補足: {task.note}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleTask(task.id, task.isCompleted)}
                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium ${
                          task.isCompleted
                            ? "bg-[var(--background)] text-[var(--muted)] border"
                            : "bg-[var(--primary)] text-white"
                        }`}
                        style={task.isCompleted ? { borderColor: "var(--border)" } : {}}
                      >
                        {task.isCompleted ? "戻す" : "完了"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-full rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  backgroundColor: "var(--card)",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
