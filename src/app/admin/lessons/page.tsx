"use client";

import { useEffect, useMemo, useState } from "react";
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
  const colorMap = useMemo(() => {
    const nextMap: Record<string, (typeof COLORS)[0]> = {};
    [...subjects.map((subject) => subject.name), ...lessons.map((lesson) => lesson.subject)].forEach((subject) => {
      if (!nextMap[subject]) {
        nextMap[subject] = COLORS[Object.keys(nextMap).length % COLORS.length];
      }
    });
    return nextMap;
  }, [lessons, subjects]);

  const getColor = (subject: string) => colorMap[subject] ?? COLORS[0];

  useEffect(() => {
    let mounted = true;
    Promise.all([fetch("/api/admin/subjects"), fetch("/api/admin/lessons")])
      .then(async ([sRes, lRes]) => {
        if (!sRes.ok) throw new Error("unauth");
        const [s, l] = await Promise.all([sRes.json(), lRes.json()]);
        if (mounted) {
          setSubjects(s);
          setLessons(l);
        }
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [router]);

  // 同じ day/period の全レッスンを返す
  const getLessons = (day: string, period: number) =>
    lessons.filter((l) => l.dayOfWeek === day && l.period === period);

  const handleDrop = async (day: string, period: number) => {
    setDragOver(null);
    if (!dragSubject) return;

    // 同じセルに同じ教科が既にあれば追加しない
    const existing = getLessons(day, period);
    if (existing.some((l) => l.subject === dragSubject)) {
      setDragSubject(null);
      return;
    }

    const res = await fetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: day, period, subject: dragSubject }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`登録に失敗しました (${res.status})\n${err.error ?? ""}`);
      return;
    }
    const newLesson = await res.json();
    setLessons((prev) => [...prev, newLesson]);
    setDragSubject(null);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/admin/lessons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { alert("削除に失敗しました"); return; }
    setLessons((prev) => prev.filter((l) => l.id !== id));
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      <div className="container-responsive py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/admin")} className="text-sm font-medium admin-link md:hidden">
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">時間割管理</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* 左: 教科パネル（スクロール可） */}
          <div className="flex flex-col lg:w-48 lg:shrink-0">
            <div className="card flex flex-col min-h-0 h-full">
              <h2 className="text-sm font-bold text-[var(--foreground)] mb-1 shrink-0">教科</h2>
              <p className="text-xs text-[var(--muted)] mb-3 shrink-0">ドラッグしてセルに追加</p>
              {subjects.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">教科が登録されていません</p>
              ) : (
                <div className="overflow-y-auto flex-1 flex flex-col gap-2 pr-1">
                  {subjects.map((s) => {
                    const c = getColor(s.name);
                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => setDragSubject(s.name)}
                        onDragEnd={() => setDragSubject(null)}
                        className="cursor-grab active:cursor-grabbing rounded-xl px-3 py-2 text-sm font-semibold select-none border shrink-0"
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold text-[var(--foreground)]">時間割グリッド</h2>
              <p className="text-xs text-[var(--muted)]">×ボタンで個別削除</p>
            </div>
            <table className="w-full table-fixed text-sm min-w-[480px]">
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
                      const cellLessons = getLessons(day, period);
                      const cellKey = `${day}-${period}`;
                      const isOver = dragOver === cellKey;
                      return (
                        <td
                          key={day}
                          className="p-1.5 align-top"
                          onDragOver={(e) => { e.preventDefault(); setDragOver(cellKey); }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={() => handleDrop(day, period)}
                        >
                          <div
                            className="rounded-xl min-h-[52px] p-1 flex flex-col gap-1 transition-colors border"
                            style={{
                              backgroundColor: isOver ? "var(--admin-50)" : "transparent",
                              borderColor: isOver ? "var(--admin-600)" : "var(--border)",
                              borderStyle: isOver || cellLessons.length > 0 ? "solid" : "dashed",
                            }}
                          >
                            {cellLessons.length === 0 && (
                              <span className="text-xs text-[var(--muted)] opacity-40 m-auto">+</span>
                            )}
                            {cellLessons.map((lesson) => {
                              const c = getColor(lesson.subject);
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between gap-1 rounded-lg px-1.5 py-1 border"
                                  style={{ backgroundColor: c.bg, borderColor: c.border }}
                                >
                                  <span className="text-xs font-semibold truncate" style={{ color: c.text }}>
                                    {lesson.subject}
                                  </span>
                                  <button
                                    onClick={() => handleDelete(lesson.id)}
                                    className="shrink-0 text-xs leading-none rounded hover:opacity-70 transition-opacity"
                                    style={{ color: c.text }}
                                    aria-label={`${lesson.subject}を削除`}
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
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
