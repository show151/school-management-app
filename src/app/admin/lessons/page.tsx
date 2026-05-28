"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Lesson = { id: string; dayOfWeek: string; period: number; subject: string };
type SubjectItem = { id: string; name: string };

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

export default function AdminLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragSubject, setDragSubject] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const colorMap = useRef<Record<string, (typeof COLORS)[0]>>({});

  const getColor = (subject: string) => {
    if (!colorMap.current[subject]) {
      const idx = Object.keys(colorMap.current).length % COLORS.length;
      colorMap.current[subject] = COLORS[idx];
    }
    return colorMap.current[subject];
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([fetch("/api/admin/subjects", { credentials: "same-origin" }), fetch("/api/admin/lessons", { credentials: "same-origin" })])
      .then(async ([sRes, lRes]) => {
        if (!sRes.ok) throw new Error("unauth");
        const [s, l] = await Promise.all([sRes.json(), lRes.json()]);
        if (mounted) { setSubjects(s); setLessons(l); }
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [router]);

  const getLesson = (day: string, period: number) =>
    lessons.find((l) => l.dayOfWeek === day && l.period === period);

  const handleDrop = async (day: string, period: number) => {
    setDragOver(null);
    if (!dragSubject) return;

    const existing = getLesson(day, period);
    if (existing) {
      await fetch("/api/admin/lessons", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existing.id }),
      });
    }

    const res = await fetch("/api/admin/lessons", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: day, period, subject: dragSubject }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`登録に失敗しました (${res.status})\n${err.error ?? ""}`);
      return;
    }
    const newLesson = await res.json();

    setLessons((prev) => {
      const filtered = existing ? prev.filter((l) => l.id !== existing.id) : prev;
      return [...filtered, newLesson];
    });
    setDragSubject(null);
  };

  const handleCellClick = async (day: string, period: number) => {
    const existing = getLesson(day, period);
    if (!existing) return;
    const res = await fetch("/api/admin/lessons", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: existing.id }),
    });
    if (!res.ok) { alert("削除に失敗しました"); return; }
    setLessons((prev) => prev.filter((l) => l.id !== existing.id));
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      <div className="container-responsive py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/admin")} className="text-sm font-medium admin-link md:hidden">
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">時間割管理</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左: 教科カード */}
          <div className="lg:w-48 shrink-0">
            <div className="card">
              <h2 className="text-sm font-bold text-[var(--foreground)] mb-3">教科</h2>
              <p className="text-xs text-[var(--muted)] mb-3">ドラッグしてグリッドに配置</p>
              {subjects.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">教科が登録されていません</p>
              ) : (
                <div className="flex flex-row lg:flex-col flex-wrap gap-2">
                  {subjects.map((s) => {
                    const c = getColor(s.name);
                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => setDragSubject(s.name)}
                        onDragEnd={() => setDragSubject(null)}
                        className="cursor-grab active:cursor-grabbing rounded-xl px-3 py-2 text-sm font-semibold select-none border"
                        style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
                      >
                        {s.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右: 時間割グリッド */}
          <div className="flex-1 card overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[var(--foreground)]">時間割グリッド</h2>
              <p className="text-xs text-[var(--muted)]">セルをクリックで削除</p>
            </div>
            <table className="w-full table-fixed text-sm min-w-[400px]">
              <thead>
                <tr style={{ backgroundColor: "var(--admin-50)" }}>
                  <th className="w-14 p-2 text-xs font-semibold text-[var(--admin-600)] rounded-tl-xl">時限</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className={`p-2 text-xs font-semibold text-[var(--admin-600)] ${i === 4 ? "rounded-tr-xl" : ""}`}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="p-2 text-xs font-semibold text-center text-[var(--muted)]">{period}限</td>
                    {DAYS.map((day) => {
                      const lesson = getLesson(day, period);
                      const cellKey = `${day}-${period}`;
                      const isOver = dragOver === cellKey;
                      const c = lesson ? getColor(lesson.subject) : null;
                      return (
                        <td
                          key={day}
                          className="p-1.5 align-top"
                          onDragOver={(e) => { e.preventDefault(); setDragOver(cellKey); }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={() => handleDrop(day, period)}
                        >
                          <div
                            onClick={() => handleCellClick(day, period)}
                            className="rounded-xl min-h-[52px] flex items-center justify-center transition-colors border"
                            style={{
                              backgroundColor: isOver ? "var(--admin-50)" : lesson && c ? c.bg : "transparent",
                              borderColor: isOver ? "var(--admin-600)" : lesson && c ? c.border : "var(--border)",
                              borderStyle: isOver || lesson ? "solid" : "dashed",
                              cursor: lesson ? "pointer" : "default",
                            }}
                          >
                            {lesson ? (
                              <span className="text-xs font-semibold px-1 text-center" style={{ color: c!.text }}>
                                {lesson.subject}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--muted)] opacity-40">+</span>
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
        </div>
      </div>
    </div>
  );
}
