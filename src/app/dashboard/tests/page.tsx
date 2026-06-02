"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TestScheduleWeekGrid } from "@/components/TestScheduleWeekGrid";
import { TestNoteDetail } from "@/components/TestNoteDetail";
import { formatSchedulePeriod } from "@/lib/test-schedule";

type ScheduleListItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  entryCount: number;
};

type ScheduleDetail = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  entries: { id: string; dayOfWeek: string; period: number; subject: string; note: string | null }[];
};

type DetailView = {
  id: string;
  subject: string;
  dayOfWeek: string;
  period: number;
  note: string | null;
};

function TestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [loading, setLoading] = useState(true);
  const [detailView, setDetailView] = useState<DetailView | null>(null);

  useEffect(() => {
    fetch("/api/test-schedules")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) throw new Error();
        return res.json() as Promise<ScheduleListItem[]>;
      })
      .then((list) => {
        if (!list) return;
        setSchedules(list);
        if (initialId) setSelectedId(initialId);
        else if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, [router, initialId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetch(`/api/test-schedules?id=${encodeURIComponent(selectedId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<ScheduleDetail>;
      })
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedId]);

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {detailView && (
        <TestNoteDetail
          subject={detailView.subject}
          dayOfWeek={detailView.dayOfWeek}
          period={detailView.period}
          note={detailView.note}
          onClose={() => setDetailView(null)}
        />
      )}

      <main className="container-responsive py-6 space-y-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← ダッシュボード
        </button>

        <h1 className="text-xl font-bold text-[var(--foreground)]">テストスケジュール</h1>

        {schedules.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">現在確認できるテスト期間はありません。</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card space-y-2 lg:col-span-1">
              <h2 className="text-sm font-bold text-[var(--foreground)]">テスト期間</h2>
              {schedules.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedId === s.id ? "border-[var(--primary)] bg-[var(--primary-50)]" : ""}`}
                  style={{ borderColor: selectedId === s.id ? undefined : "var(--border)" }}
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">{s.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{formatSchedulePeriod(s.startDate, s.endDate)}</p>
                  <p className="text-xs text-[var(--muted)]">{s.entryCount}件</p>
                </button>
              ))}
            </div>

            <div className="card lg:col-span-2 overflow-x-auto">
              {!detail ? (
                <p className="text-sm text-[var(--muted)]">読み込み中...</p>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">{detail.title}</h2>
                  <p className="text-sm text-[var(--muted)] mb-2">{formatSchedulePeriod(detail.startDate, detail.endDate)}</p>
                  <p className="text-xs text-[var(--muted)] mb-4">教科をタップすると特記事項を表示します。</p>
                  <TestScheduleWeekGrid
                    entries={detail.entries}
                    startDate={detail.startDate}
                    endDate={detail.endDate}
                    onSubjectClick={(entry) =>
                      setDetailView({
                        id: entry.id,
                        subject: entry.subject,
                        dayOfWeek: entry.dayOfWeek,
                        period: entry.period,
                        note: entry.note ?? null,
                      })
                    }
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>}>
      <TestsPageContent />
    </Suspense>
  );
}
