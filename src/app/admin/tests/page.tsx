"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TestScheduleWeekGrid } from "@/components/TestScheduleWeekGrid";
import { TestNoteDetail } from "@/components/TestNoteDetail";
import { sendAdminEmail } from "@/lib/send-admin-email";
import {
  formatSchedulePeriod,
  formatTestSlot,
  type TestScheduleDto,
  type TestScheduleEntryDto,
} from "@/lib/test-schedule";

type Subject = { id: string; name: string };
type User = { id: string; name: string };

type DetailView = TestScheduleEntryDto;

export default function AdminTestsPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<TestScheduleDto[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [dragSubject, setDragSubject] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [studentNumberFrom, setStudentNumberFrom] = useState("");
  const [studentNumberTo, setStudentNumberTo] = useState("");
  const [detailView, setDetailView] = useState<DetailView | null>(null);
  const [editNote, setEditNote] = useState("");

  // 期間編集用state
  const [editScheduleTarget, setEditScheduleTarget] = useState<TestScheduleDto | null>(null);
  const [editScheduleTitle, setEditScheduleTitle] = useState("");
  const [editScheduleStart, setEditScheduleStart] = useState("");
  const [editScheduleEnd, setEditScheduleEnd] = useState("");
  const [editScheduleUserIds, setEditScheduleUserIds] = useState<string[]>([]);

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) ?? null;

  const loadData = useCallback(async () => {
    const [schedulesRes, subjectsRes, usersRes] = await Promise.all([
      fetch("/api/admin/test-schedules", { credentials: "same-origin" }),
      fetch("/api/admin/subjects", { credentials: "same-origin" }),
      fetch("/api/admin/users", { credentials: "same-origin" }),
    ]);
    if (!schedulesRes.ok || !subjectsRes.ok || !usersRes.ok) throw new Error();
    const [nextSchedules, nextSubjects, nextUsers] = await Promise.all([
      schedulesRes.json(),
      subjectsRes.json(),
      usersRes.json(),
    ]);
    setSchedules(nextSchedules as TestScheduleDto[]);
    setSubjects(nextSubjects as Subject[]);
    setUsers(nextUsers as User[]);
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [loadData, router]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) {
      alert("タイトルと期間を入力してください。");
      return;
    }
    const res = await fetch("/api/admin/test-schedules", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, startDate, endDate }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "登録に失敗しました。");
      return;
    }
    const created = (await res.json()) as TestScheduleDto;
    setTitle("");
    setStartDate("");
    setEndDate("");
    await loadData();
    setSelectedScheduleId(created.id);
  };

  const handleAddEntry = async (dayOfWeek: string, period: number, subject: string) => {
    if (!selectedScheduleId) return;
    const res = await fetch("/api/admin/test-schedules/entries", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId: selectedScheduleId, dayOfWeek, period, subject, note: "" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "登録に失敗しました。");
      return;
    }
    await loadData();
  };

  const handleSaveNote = async () => {
    if (!detailView) return;
    const res = await fetch("/api/admin/test-schedules/entries", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: detailView.id, note: editNote }),
    });
    if (!res.ok) {
      alert("特記事項の保存に失敗しました。");
      return;
    }
    setDetailView(null);
    await loadData();
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("この教科を削除しますか？")) return;
    const res = await fetch("/api/admin/test-schedules/entries", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });
    if (!res.ok) {
      alert("削除に失敗しました。");
      return;
    }
    if (detailView?.id === entryId) setDetailView(null);
    await loadData();
  };

  const handleNotify = async () => {
    if (!selectedSchedule) return;
    const emailResult = await sendAdminEmail({
      type: "testSchedule",
      selectedUserIds,
      studentNumberFrom,
      studentNumberTo,
      payload: {
        scheduleTitle: selectedSchedule.title,
        scheduleId: selectedSchedule.id,
        startDate: selectedSchedule.startDate,
        endDate: selectedSchedule.endDate,
      },
    });
    if (!emailResult.ok) alert(`メール送信に失敗しました: ${emailResult.error}`);
    else alert("テスト連絡メールを送信しました。");
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("このテストスケジュールを削除しますか？")) return;
    const res = await fetch("/api/admin/test-schedules", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    });
    if (!res.ok) {
      alert("削除に失敗しました。");
      return;
    }
    if (selectedScheduleId === scheduleId) setSelectedScheduleId(null);
    await loadData();
  };

  const handleEditSchedule = (s: TestScheduleDto) => {
    setEditScheduleTarget(s);
    setEditScheduleTitle(s.title);
    setEditScheduleStart(s.startDate.slice(0, 10));
    setEditScheduleEnd(s.endDate.slice(0, 10));
    setEditScheduleUserIds([]);
  };

  const handleSaveEditSchedule = async () => {
    if (!editScheduleTarget || !editScheduleTitle.trim() || !editScheduleStart || !editScheduleEnd) return;
    const res = await fetch("/api/admin/test-schedules", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId: editScheduleTarget.id, title: editScheduleTitle, startDate: editScheduleStart, endDate: editScheduleEnd }),
    });
    if (!res.ok) { alert("更新に失敗しました。"); return; }

    if (editScheduleUserIds.length > 0) {
      const emailResult = await sendAdminEmail({
        type: "testScheduleUpdate",
        selectedUserIds: editScheduleUserIds,
        studentNumberFrom: "",
        studentNumberTo: "",
        payload: { scheduleTitle: editScheduleTitle, scheduleId: editScheduleTarget.id, startDate: editScheduleStart, endDate: editScheduleEnd },
      });
      if (!emailResult.ok) alert(`通知メールの送信に失敗しました: ${emailResult.error}`);
    }

    setEditScheduleTarget(null);
    await loadData();
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      {editScheduleTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setEditScheduleTarget(null)}
          role="presentation"
        >
          <div className="card w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 className="text-base font-bold text-[var(--foreground)]">テスト期間を編集</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">タイトル</label>
              <input value={editScheduleTitle} onChange={(e) => setEditScheduleTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">開始日</label>
              <input type="date" value={editScheduleStart} onChange={(e) => setEditScheduleStart(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">終了日</label>
              <input type="date" value={editScheduleEnd} onChange={(e) => setEditScheduleEnd(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                更新を通知するユーザー（任意）
                {editScheduleUserIds.length > 0 && <span className="ml-2 admin-pill">{editScheduleUserIds.length}人</span>}
              </label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                {users.map((user) => (
                  <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--admin-50)]">
                    <input type="checkbox" checked={editScheduleUserIds.includes(user.id)} onChange={() => setEditScheduleUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} />
                    <span className="text-xs">{user.name}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setEditScheduleUserIds(users.map(u => u.id))} className="mt-2 w-full admin-outline">すべて選択</button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleSaveEditSchedule} className="flex-1 admin-btn">保存{editScheduleUserIds.length > 0 ? " + 通知" : ""}</button>
              <button type="button" onClick={() => setEditScheduleTarget(null)} className="text-xs text-[var(--muted)] px-3">キャンセル</button>
            </div>
          </div>
        </div>
      )}
      {detailView && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setDetailView(null)}
          role="presentation"
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 className="text-lg font-bold text-[var(--foreground)]">{detailView.subject}</h3>
            <p className="text-xs text-[var(--muted)] mb-3">{formatTestSlot(detailView.dayOfWeek, detailView.period)}</p>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">特記事項（Markdown可）</label>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="min-h-24 mb-3"
            />
            <div className="flex gap-2">
              <button type="button" onClick={handleSaveNote} className="flex-1 admin-btn">保存</button>
              <button
                type="button"
                onClick={() => handleDeleteEntry(detailView.id)}
                className="text-xs font-medium text-red-500 px-3"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container-responsive py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/admin")} className="text-sm font-medium admin-link md:hidden">
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">テスト連絡・スケジュール</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="card h-fit xl:col-span-1 space-y-6">
            <div>
              <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">1. テスト期間を登録</h2>
              <form onSubmit={handleCreateSchedule} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">タイトル</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 第1回定期テスト" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">開始日</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">終了日</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <button type="submit" className="w-full admin-btn">期間を登録</button>
              </form>
            </div>

            <div>
              <h2 className="mb-2 text-base font-bold text-[var(--foreground)]">登録済みの期間</h2>
              {schedules.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">まだ期間が登録されていません。</p>
              ) : (
                    <div className="space-y-2">
                  {schedules.map((s) => (
                    <div
                      key={s.id}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedScheduleId === s.id ? "border-[var(--admin-600)] bg-[var(--admin-50)]" : ""}`}
                      style={{ borderColor: selectedScheduleId === s.id ? undefined : "var(--border)" }}
                    >
                      <div role="button" tabIndex={0} onClick={() => setSelectedScheduleId(s.id)} onKeyDown={(e) => { if (e.key === "Enter") setSelectedScheduleId(s.id); }} className="cursor-pointer">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{s.title}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{formatSchedulePeriod(s.startDate, s.endDate)}</p>
                        <p className="text-xs text-[var(--muted)]">{s.entries.length}件登録</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEditSchedule(s); }}
                        className="mt-1 text-xs font-medium text-[var(--admin-600)] hover:underline"
                      >
                        編集
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card xl:col-span-2 space-y-4">
            {!selectedSchedule ? (
              <p className="text-sm text-[var(--muted)]">期間を選択すると、曜日×時限の表に教科を登録できます。</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[var(--foreground)]">2. 曜日・時限ごとに教科を登録</h2>
                    <p className="text-sm text-[var(--muted)]">{selectedSchedule.title}</p>
                    <p className="text-xs text-[var(--muted)]">{formatSchedulePeriod(selectedSchedule.startDate, selectedSchedule.endDate)}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">各セルに複数教科を登録できます。+ または下の教科を選んで追加。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    期間を削除
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-2 lg:hidden">教科をタップ→セルをタップで追加</p>
                    <p className="text-xs text-[var(--muted)] mb-2 hidden lg:block">教科を選択またはドラッグして追加</p>
                    {selectedSubject && (
                      <p className="mb-2 text-xs font-medium text-[var(--admin-600)]">選択中: {selectedSubject}</p>
                    )}
                    <div className="flex flex-nowrap lg:flex-wrap gap-2 overflow-x-auto lg:overflow-y-auto pb-1 lg:pb-0 lg:max-h-64 pr-1">
                      {subjects.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          draggable
                          onDragStart={() => { setDragSubject(s.name); setSelectedSubject(""); }}
                          onDragEnd={() => setDragSubject("")}
                          onClick={() => setSelectedSubject(selectedSubject === s.name ? "" : s.name)}
                          className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold touch-manipulation cursor-grab active:cursor-grabbing ${selectedSubject === s.name ? "ring-2 ring-[var(--admin-600)]" : ""}`}
                          style={{ borderColor: "var(--border)" }}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <TestScheduleWeekGrid
                      entries={selectedSchedule.entries}
                      startDate={selectedSchedule.startDate}
                      endDate={selectedSchedule.endDate}
                      selectedSubject={selectedSubject || dragSubject}
                      onCellAdd={handleAddEntry}
                      onDeleteEntry={handleDeleteEntry}
                      onSubjectClick={(entry) => {
                        setEditNote(entry.note ?? "");
                        setDetailView({
                          id: entry.id,
                          dayOfWeek: entry.dayOfWeek,
                          period: entry.period,
                          subject: entry.subject,
                          note: entry.note ?? null,
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3" style={{ borderColor: "var(--border)" }}>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">3. 連絡メール送信（任意）</h3>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                    {users.map((user) => (
                      <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() =>
                            setSelectedUserIds((prev) =>
                              prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                            )
                          }
                        />
                        <span className="text-xs">{user.name}</span>
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={() => setSelectedUserIds(users.map((u) => u.id))} className="w-full admin-outline">
                    すべて選択
                  </button>
                  <button type="button" onClick={handleNotify} className="w-full admin-outline">
                    スケジュール公開メールを送信
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
