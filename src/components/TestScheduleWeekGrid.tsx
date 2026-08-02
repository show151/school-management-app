"use client";

import { useState } from "react";
import { TEST_DAYS, TEST_PERIODS } from "@/lib/test-schedule";

export type TestWeekEntry = {
  id: string;
  dayOfWeek: string;
  period: number;
  subject: string;
  note?: string | null;
};

type Props = {
  entries: TestWeekEntry[];
  startDate?: string;
  endDate?: string;
  selectedSubject?: string | null;
  onSubjectClick?: (entry: TestWeekEntry) => void;
  onCellAdd?: (dayOfWeek: string, period: number, subject: string) => void;
  onDeleteEntry?: (entryId: string) => void;
};

const JS_DAY_TO_KANJI: Record<number, string> = { 1: "月", 2: "火", 3: "水", 4: "木", 5: "金" };

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildDayColumns(startDate?: string, endDate?: string): { day: string; label: string; key: string }[] {
  if (!startDate) return TEST_DAYS.map((d) => ({ day: d, label: d, key: d }));
  const start = parseLocalDate(startDate);
  const end = endDate ? parseLocalDate(endDate) : start;
  const cols: { day: string; label: string; key: string }[] = [];
  const cur = new Date(start);
  while (cur <= end && cols.length < 14) {
    const jsDay = cur.getDay();
    const kanji = JS_DAY_TO_KANJI[jsDay];
    if (kanji) {
      const key = `${cur.getFullYear()}-${cur.getMonth() + 1}-${cur.getDate()}`;
      cols.push({ day: kanji, label: `${cur.getMonth() + 1}/${cur.getDate()}(${kanji})`, key });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return cols.length > 0 ? cols : TEST_DAYS.map((d) => ({ day: d, label: d, key: d }));
}

const SUBJECT_COLORS = [
  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  { bg: "#fef9c3", text: "#a16207", border: "#fde047" },
  { bg: "#fce7f3", text: "#be185d", border: "#f9a8d4" },
  { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd" },
  { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  { bg: "#cffafe", text: "#0e7490", border: "#67e8f9" },
  { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
];

export function TestScheduleWeekGrid({
  entries,
  startDate,
  endDate,
  selectedSubject,
  onSubjectClick,
  onCellAdd,
  onDeleteEntry,
}: Props) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dayColumns = buildDayColumns(startDate, endDate);

  // 同じ曜日が複数回出現するかのマップ（レガシーフォールバック判定用）
  const dayCount: Record<string, number> = {};
  dayColumns.forEach(({ day }) => { dayCount[day] = (dayCount[day] ?? 0) + 1; });

  // エントリーのフィルタリング: 日付キー（新形式）で一致するか、
  // 同じ曜日が1回しかないカラムの場合は漢字（レガシー形式）でもフォールバック
  const getCellEntries = (colKey: string, colDay: string, period: number) =>
    entries.filter((e) => {
      if (e.period !== period) return false;
      if (e.dayOfWeek === colKey) return true;
      // レガシー互換: 同じ曜日が1つしかない場合のみ漢字マッチ
      if ((dayCount[colDay] ?? 0) <= 1 && e.dayOfWeek === colDay) return true;
      return false;
    });
  const canAdd = Boolean(onCellAdd);

  // 教科ごとに色を割り当て
  const colorMap: Record<string, typeof SUBJECT_COLORS[0]> = {};
  let ci = 0;
  entries.forEach((e) => {
    if (!(e.subject in colorMap)) colorMap[e.subject] = SUBJECT_COLORS[ci++ % SUBJECT_COLORS.length];
  });

  // 今日の日付文字列 (YYYY-M-D)
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr>
            <th className="w-10 py-2 px-2 text-xs font-bold text-center rounded-tl-xl" style={{ backgroundColor: "var(--primary-50)", color: "var(--primary)" }}>時限</th>
            {dayColumns.map(({ day, label, key }, i) => {
              const isToday = key === todayKey;
              return (
                <th
                  key={key}
                  className={`py-2 px-1 text-xs font-bold text-center ${i === dayColumns.length - 1 ? "rounded-tr-xl" : ""}`}
                  style={{
                    backgroundColor: isToday ? "var(--primary)" : "var(--primary-50)",
                    color: isToday ? "#fff" : "var(--primary)",
                  }}
                >
                  {label}{isToday && <span className="ml-1 text-[10px] opacity-80">今日</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {TEST_PERIODS.map((period) => (
            <tr key={period} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="py-2 px-1 text-xs font-semibold text-center text-[var(--muted)]">{period}限</td>
              {dayColumns.map(({ day, key }) => {
                const cellEntries = getCellEntries(key, day, period);
                const cellKey = `${key}-${period}`;
                const isOver = dragOver === cellKey;
                const isToday = key === todayKey;
                return (
                  <td
                    key={key}
                    className="py-1.5 px-1 align-top"
                    style={isToday && !canAdd ? { backgroundColor: "rgba(79,70,229,0.04)" } : {}}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(cellKey); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => {
                      setDragOver(null);
                      if (selectedSubject) onCellAdd?.(key, period, selectedSubject);
                    }}
                  >
                    <div
                      role={canAdd ? "button" : undefined}
                      tabIndex={canAdd && selectedSubject ? 0 : -1}
                      onClick={() => { if (selectedSubject) onCellAdd?.(key, period, selectedSubject); }}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && selectedSubject) onCellAdd?.(key, period, selectedSubject); }}
                      className="flex flex-col gap-1 min-h-[36px] rounded-xl p-1 transition-colors"
                      style={{
                        backgroundColor: isOver ? "var(--primary-50)" : (canAdd && selectedSubject) ? "rgba(79,70,229,0.04)" : "transparent",
                        outline: isOver ? "2px solid var(--primary)" : "none",
                        cursor: canAdd && selectedSubject ? "pointer" : "default",
                      }}
                    >
                      {cellEntries.length === 0 && (
                        <div className="rounded-xl py-2 px-1 text-xs text-center text-[var(--muted)] opacity-30">
                          {canAdd && selectedSubject ? "+ 追加" : "—"}
                        </div>
                      )}
                      {cellEntries.map((entry) => {
                        const c = colorMap[entry.subject] ?? SUBJECT_COLORS[0];
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between gap-0.5 rounded-xl py-1.5 px-2 border"
                            style={{ backgroundColor: c.bg, borderColor: c.border }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onSubjectClick?.(entry); }}
                              className="min-w-0 flex-1 text-left text-xs font-semibold truncate touch-manipulation"
                              style={{ color: c.text }}
                            >
                              {entry.subject}
                            </button>
                            {onDeleteEntry && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                                className="shrink-0 text-xs leading-none min-w-[20px] min-h-[20px] touch-manipulation hover:opacity-60"
                                style={{ color: c.text }}
                                aria-label={`${entry.subject}を削除`}
                              >
                                ×
                              </button>
                            )}
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
  );
}
