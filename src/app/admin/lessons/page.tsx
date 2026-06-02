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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
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
  const activeSubject = dragSubject ?? selectedSubject;

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/admin/subjects", { credentials: "same-origin" }),
      fetch("/api/admin/lessons", { credentials: "same-origin" }),
    ])
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

  const getLessons = (day: string, period: number) =>
    lessons.filter((l) => l.dayOfWeek === day && l.period === period);

  const addLesson = async (day: string, period: number, subject: string) => {
    const existing = getLessons(day, period);
    if (existing.some((l) => l.subject === subject)) return;

    const res = await fetch("/api/admin/lessons", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: day, period, subject }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`登録に失敗しました (${res.status})\n${err.error ?? ""}`);
      return;
    }
    const newLesson = await res.json();
    setLessons((prev) => [...prev, newLesson]);
  };

  const handleDrop = async (day: string, period: number) => {
    setDragOver(null);
    if (!dragSubject) return;
    await addLesson(day, period, dragSubject);
    setDragSubject(null);
  };

  const handleCellTap = async (day: string, period: number) => {
    if (!selectedSubject) return;
    await addLesson(day, period, selectedSubject);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/admin/lessons", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { alert("削除に失敗しました"); return; }
    setLessons((prev) => prev.filter((l) => l.id !== id));
  };

  const toggleSubjectSelection = (name: string) => {
    setSelectedSubject((prev) => (prev === name ? null : name));
    setDragSubject(null);
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

          <div className="flex flex-col lg:w-48 lg:shrink-0">
            <div className="card flex flex-col min-h-0 h-full">
              <h2 className="text-sm font-bold text-[var(--foreground)] mb-1 shrink-0">教科</h2>
              <p className="text-xs text-[var(--muted)] mb-1 shrink-0 lg:hidden">
                教科をタップしてから、下のセルをタップして追加
              </p>
              <p className="text-xs text-[var(--muted)] mb-3 shrink-0 hidden lg:block">
                ドラッグしてセルに追加
              </p>
              {activeSubject && (
                <p className="mb-2 text-xs font-medium text-[var(--admin-600)] shrink-0">
                  選択中: {activeSubject}
                </p>
              )}
              {subjects.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">教科が登録されていません</p>
              ) : (
                <div className="overflow-y-auto flex-1 flex flex-col gap-2 pr-1 max-h-48 lg:max-h-64">
                  {subjects.map((s) => {
                    const c = getColor(s.name);
                    const isSelected = selectedSubject === s.name;
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={() => {
                          setDragSubject(s.name);
                          setSelectedSubject(null);
                        }}
                        onDragEnd={() => setDragSubject(null)}
                        onClick={() => toggleSubjectSelection(s.name)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSubjectSelection(s.name);
                          }
                        }}
                        className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold select-none border shrink-0 touch-manipulation lg:cursor-grab lg:active:cursor-grabbing ${isSelected ? "ring-2 ring-[var(--admin-600)]" : ""}`}
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

          <div className="flex-1 card overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold text-[var(--foreground)]">時間割グリッド</h2>
              <p className="text-xs text-[var(--muted)]">×ボタンで個別削除</p>
            </div>
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr>
                  <th className="w-10 py-2 px-2 text-xs font-bold text-center rounded-tl-xl" style={{ backgroundColor: "var(--admin-50)", color: "var(--admin-600)" }}>時限</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className={`py-2 px-2 text-xs font-bold text-center ${i === 4 ? "rounded-tr-xl" : ""}`} style={{ backgroundColor: "var(--admin-50)", color: "var(--admin-600)" }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 px-2 text-xs font-semibold text-center text-[var(--muted)]">{period}限</td>
                    {DAYS.map((day) => {
                      const cellLessons = getLessons(day, period);
                      const cellKey = `${day}-${period}`;
                      const isOver = dragOver === cellKey;
                      const canTapAdd = Boolean(selectedSubject);
                      return (
                        <td
                          key={day}
                          className="py-1.5 px-1 align-top"
                          onDragOver={(e) => { e.preventDefault(); setDragOver(cellKey); }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={() => handleDrop(day, period)}
                        >
                          <div
                            role="button"
                            tabIndex={canTapAdd ? 0 : -1}
                            onClick={() => handleCellTap(day, period)}
                            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && canTapAdd) handleCellTap(day, period); }}
                            aria-label={`${day}曜${period}限`}
                            className="flex flex-col gap-1 min-h-[36px] rounded-xl p-1 transition-colors"
                            style={{
                              backgroundColor: isOver ? "var(--admin-50)" : canTapAdd ? "rgba(79,70,229,0.04)" : "transparent",
                              outline: isOver ? "2px solid var(--admin-600)" : "none",
                              cursor: canTapAdd ? "pointer" : "default",
                            }}
                          >
                            {cellLessons.length === 0 && (
                              <div className="rounded-xl py-2 px-1 text-xs text-center text-[var(--muted)] opacity-30">
                                {canTapAdd ? "+ 追加" : "—"}
                              </div>
                            )}
                            {cellLessons.map((lesson) => {
                              const c = getColor(lesson.subject);
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between gap-0.5 rounded-xl py-1.5 px-2 border"
                                  style={{ backgroundColor: c.bg, borderColor: c.border }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-xs font-semibold truncate" style={{ color: c.text }}>
                                    {lesson.subject}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(lesson.id);
                                    }}
                                    className="shrink-0 text-xs leading-none rounded hover:opacity-60 transition-opacity min-w-[20px] min-h-[20px] flex items-center justify-center touch-manipulation"
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
