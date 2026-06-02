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

export function sortTestEntries<T extends { dayOfWeek: string; period: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99);
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

export function formatTestSlot(dayOfWeek: string, period: number) {
  return `${dayOfWeek}曜 ${period}限`;
}

export function cellKey(dayOfWeek: string, period: number) {
  return `${dayOfWeek}-${period}`;
}
