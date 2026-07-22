export const TEST_DAYS = ["月", "火", "水", "木", "金"] as const;
export const TEST_PERIODS = [1, 2, 3, 4] as const;

export type TestDay = (typeof TEST_DAYS)[number];

export type TestScheduleEntryDto = {
  id: string;
  dayOfWeek: string;
  period: number;
  subject: string;
  note: string | null;
};

export type TestScheduleDto = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  entries: TestScheduleEntryDto[];
};

const DAY_ORDER: Record<string, number> = { 月: 0, 火: 1, 水: 2, 木: 3, 金: 4 };

/** dayOfWeek が日付文字列 ("YYYY-M-D") かどうか判定 */
function isDayOfWeekDate(dayOfWeek: string): boolean {
  return /^\d{4}-\d{1,2}-\d{1,2}$/.test(dayOfWeek);
}

/** dayOfWeek をソート用の数値に変換（日付文字列ならタイムスタンプ、漢字なら順番） */
function dayOfWeekSortValue(dayOfWeek: string): number {
  if (isDayOfWeekDate(dayOfWeek)) {
    const [y, m, d] = dayOfWeek.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  return DAY_ORDER[dayOfWeek] ?? 99;
}

export function sortTestEntries<T extends { dayOfWeek: string; period: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const dayDiff = dayOfWeekSortValue(a.dayOfWeek) - dayOfWeekSortValue(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.period - b.period;
  });
}

export function formatSchedulePeriod(startDate: string | Date, endDate: string | Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  return `${start.toLocaleDateString("ja-JP", opts)} 〜 ${end.toLocaleDateString("ja-JP", opts)}`;
}

const JS_DAY_TO_KANJI_MAP: Record<number, string> = { 0: "日", 1: "月", 2: "火", 3: "水", 4: "木", 5: "金", 6: "土" };

export function formatTestSlot(dayOfWeek: string, period: number) {
  if (isDayOfWeekDate(dayOfWeek)) {
    const [y, m, d] = dayOfWeek.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const kanji = JS_DAY_TO_KANJI_MAP[date.getDay()] ?? "";
    return `${m}/${d}(${kanji}) ${period}限`;
  }
  return `${dayOfWeek}曜 ${period}限`;
}

export function cellKey(dayOfWeek: string, period: number) {
  return `${dayOfWeek}-${period}`;
}
