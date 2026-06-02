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
  while (cur <= end && cols.length < 7) {
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
  const getCellEntries = (day: string, period: number) =>
    entries.filter((e) => e.dayOfWeek === day && e.period === period);
  const canAdd = Boolean(onCellAdd);

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-sm min-w-[320px]">
        <thead>
          <tr style={{ backgroundColor: "var(--primary-50)" }}>
            <th className="w-12 p-2 text-xs font-semibold text-[var(--primary)] rounded-tl-xl">時限</th>
            {dayColumns.map(({ day, label, key }, i) => (
              <th
                key={key}
                className={`p-2 text-xs font-semibold text-[var(--primary)] ${i === dayColumns.length - 1 ? "rounded-tr-xl" : ""}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TEST_PERIODS.map((period) => (
            <tr key={period} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="p-2 text-xs font-semibold text-center text-[var(--muted)]">{period}限</td>
              {dayColumns.map(({ day, key }) => {
                const cellEntries = getCellEntries(day, period);
                const cellKey = `${key}-${period}`;
                const isOver = dragOver === cellKey;
                return (
                  <td
                    key={key}
                    className="p-1.5 align-top"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(cellKey); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => {
                      setDragOver(null);
                      if (selectedSubject) onCellAdd?.(day, period, selectedSubject);
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={canAdd && selectedSubject ? 0 : -1}
                      onClick={() => { if (selectedSubject) onCellAdd?.(day, period, selectedSubject); }}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && selectedSubject) onCellAdd?.(day, period, selectedSubject); }}
                      className="w-full rounded-xl min-h-[52px] p-1 flex flex-col gap-1 transition-colors border text-left touch-manipulation"
                      style={{
                        backgroundColor: isOver ? "var(--admin-50)" : (canAdd && selectedSubject) ? "rgba(79,70,229,0.04)" : "transparent",
                        borderColor: isOver ? "var(--admin-600)" : "var(--border)",
                        borderStyle: isOver || cellEntries.length > 0 ? "solid" : "dashed",
                        cursor: canAdd && selectedSubject ? "pointer" : "default",
                      }}
                    >
                      {cellEntries.length === 0 && canAdd && (
                        <span className="text-xs text-[var(--muted)] opacity-40 m-auto pointer-events-none">
                          {selectedSubject ? "タップで追加" : "+"}
                        </span>
                      )}
                      {cellEntries.length === 0 && !canAdd && (
                        <span className="text-xs text-[var(--muted)] opacity-40 m-auto">—</span>
                      )}
                      {cellEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-0.5 rounded-lg px-1.5 py-1 border bg-[var(--card)]"
                          style={{ borderColor: "var(--border)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onSubjectClick?.(entry); }}
                            className="min-w-0 flex-1 text-left text-xs font-semibold text-[var(--foreground)] truncate touch-manipulation hover:underline"
                          >
                            {entry.subject}
                          </button>
                          {onDeleteEntry && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                              className="shrink-0 text-xs leading-none text-[var(--muted)] hover:text-red-600 min-w-[20px] min-h-[20px] touch-manipulation"
                              aria-label={`${entry.subject}を削除`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
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
