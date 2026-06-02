"use client";

import { markdownToHtml } from "@/lib/markdown";
import { formatTestSlot } from "@/lib/test-schedule";

type Props = {
  subject: string;
  dayOfWeek: string;
  period: number;
  note: string | null;
  onClose: () => void;
};

export function TestNoteDetail({ subject, dayOfWeek, period, note, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="test-note-title"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-[var(--muted)]">{formatTestSlot(dayOfWeek, period)}</p>
            <h3 id="test-note-title" className="text-lg font-bold text-[var(--foreground)]">
              {subject}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-1"
            aria-label="閉じる"
          >
            閉じる
          </button>
        </div>
        <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-medium text-[var(--muted)] mb-2">特記事項</p>
          {note?.trim() ? (
            <div
              className="text-sm text-[var(--foreground)] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(note) }}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">特記事項はありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}
