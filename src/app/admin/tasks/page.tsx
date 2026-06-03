"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendAdminEmail } from "@/lib/send-admin-email";

type Task = { batchId: string; subject: string; title: string; dueDate: string; note: string | null; assignedCount: number; completedCount: number };
type Subject = { id: string; name: string };
type User = { id: string; studentNumber?: number | null; name: string; email: string; createdAt: string };

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [studentNumberFrom, setStudentNumberFrom] = useState('');
  const [studentNumberTo, setStudentNumberTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [subjectError, setSubjectError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dueDateError, setDueDateError] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 締切変更用state
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editUserIds, setEditUserIds] = useState<string[]>([]);

  // 再送信用state
  const [resendTarget, setResendTarget] = useState<Task | null>(null);
  const [resendUserIds, setResendUserIds] = useState<string[]>([]);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendAssign, setResendAssign] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tasks", { credentials: "same-origin" });
      if (!res.ok) throw new Error();
      setTasks((await res.json()) as Task[]);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch("/api/admin/tasks", { credentials: "same-origin" }),
      fetch("/api/admin/subjects", { credentials: "same-origin" }),
      fetch("/api/admin/users", { credentials: "same-origin" }),
    ])
      .then(async ([tasksRes, subjectsRes, usersRes]) => {
        if (!tasksRes.ok || !subjectsRes.ok || !usersRes.ok) throw new Error();
        return {
          nextTasks: (await tasksRes.json()) as Task[],
          nextSubjects: (await subjectsRes.json()) as Subject[],
          nextUsers: (await usersRes.json()) as User[],
        };
      })
      .then(({ nextTasks, nextSubjects, nextUsers }) => {
        if (isMounted) { setTasks(nextTasks); setSubjects(nextSubjects); setUsers(nextUsers); }
      })
      .catch(() => router.push("/"))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [router]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError(""); setTitleError(""); setDueDateError("");
    if (!subject) setSubjectError("教科を選択してください。");
    if (!title) setTitleError("課題タイトルを入力してください。");
    if (!dueDate) setDueDateError("締切日を入力してください。");
    if (!subject || !title || !dueDate) return;

    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, title, dueDate, note }),
    });
    if (!res.ok) { alert("追加に失敗しました。"); return; }

    const emailResult = await sendAdminEmail({
      type: "task",
      selectedUserIds,
      studentNumberFrom,
      studentNumberTo,
      payload: { taskTitle: title, dueDate },
    });
    if (!emailResult.ok) {
      alert(`メール送信に失敗しました: ${emailResult.error}`);
    }

    setSubject(""); setTitle(""); setDueDate(""); setNote(""); setSelectedUserIds([]);
    fetchTasks();
  };

  const handleDeleteTask = async (batchId: string) => {
    if (!confirm("この課題を削除してもよろしいですか？")) return;
    const res = await fetch("/api/admin/tasks", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId }),
    });
    if (res.ok) fetchTasks();
    else alert("削除に失敗しました。");
  };

  const handleEditTask = (task: Task) => {
    setEditTarget(task);
    setEditDueDate(task.dueDate.slice(0, 10));
    setEditNote(task.note ?? "");
    setEditUserIds([]);
  };

  const handleSaveEditTask = async () => {
    if (!editTarget || !editDueDate) return;
    const res = await fetch("/api/admin/tasks", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: editTarget.batchId, dueDate: editDueDate, note: editNote }),
    });
    if (!res.ok) { alert("更新に失敗しました。"); return; }

    if (editUserIds.length > 0) {
      const emailResult = await sendAdminEmail({
        type: "taskDueDateUpdate",
        selectedUserIds: editUserIds,
        studentNumberFrom: "",
        studentNumberTo: "",
        payload: { taskTitle: editTarget.title, subject: editTarget.subject, dueDate: editDueDate },
      });
      if (!emailResult.ok) alert(`通知メールの送信に失敗しました: ${emailResult.error}`);
    }

    setEditTarget(null);
    fetchTasks();
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleResendTask = async () => {
    if (!resendTarget || resendUserIds.length === 0) return;
    setResendLoading(true);

    if (resendAssign) {
      const assignRes = await fetch("/api/admin/tasks/assign", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: resendTarget.batchId, userIds: resendUserIds }),
      });
      if (!assignRes.ok) {
        alert("課題の割り当てに失敗しました。メール送信を中止します。");
        setResendLoading(false);
        return;
      }
    }

    const emailResult = await sendAdminEmail({
      type: "task",
      selectedUserIds: resendUserIds,
      studentNumberFrom: "",
      studentNumberTo: "",
      payload: { taskTitle: resendTarget.title, dueDate: resendTarget.dueDate },
    });
    setResendLoading(false);
    if (!emailResult.ok) {
      alert(`再送信に失敗しました: ${emailResult.error}`);
    } else {
      alert(`${resendUserIds.length}人に再送信しました。${resendAssign ? '課題リストへの追加も行いました。' : ''}`);
      fetchTasks();
    }
    setResendTarget(null);
    setResendUserIds([]);
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      {/* 再送信モーダル */}
      {resendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => { setResendTarget(null); setResendUserIds([]); }}
          role="presentation"
        >
          <div className="card w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 className="text-base font-bold text-[var(--foreground)]">課題を再送信</h3>
            <p className="text-sm text-[var(--foreground)]">【{resendTarget.subject}】{resendTarget.title}</p>
            <p className="text-xs text-[var(--muted)]">締切: {new Date(resendTarget.dueDate).toLocaleDateString()}</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                再送信するユーザー
                {resendUserIds.length > 0 && <span className="ml-2 admin-pill">{resendUserIds.length}人</span>}
              </label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                {users.map((user) => (
                  <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--admin-50)]">
                    <input type="checkbox" checked={resendUserIds.includes(user.id)} onChange={() => setResendUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} />
                    <span className="text-xs">{user.studentNumber ? `(${user.studentNumber}) ` : ''}{user.name}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setResendUserIds(users.map(u => u.id))} className="mt-2 w-full admin-outline">すべて選択</button>
            </div>
            <div className="mt-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={resendAssign} onChange={(e) => setResendAssign(e.target.checked)} />
                <span className="text-sm font-medium text-[var(--foreground)]">対象ユーザーの課題リストにも追加する</span>
              </label>
              <p className="text-xs text-[var(--muted)] ml-5 mt-1">※既にこの課題がリストにあるユーザーは重複して追加されません</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleResendTask} disabled={resendUserIds.length === 0 || resendLoading} className="flex-1 admin-btn disabled:opacity-50">
                {resendLoading ? "送信中..." : `再送信 (${resendUserIds.length}人)`}
              </button>
              <button type="button" onClick={() => { setResendTarget(null); setResendUserIds([]); }} className="text-xs text-[var(--muted)] px-3">キャンセル</button>
            </div>
          </div>
        </div>
      )}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setEditTarget(null)}
          role="presentation"
        >
          <div className="card w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 className="text-base font-bold text-[var(--foreground)]">締切日を変更</h3>
            <p className="text-sm text-[var(--foreground)]">【{editTarget.subject}】{editTarget.title}</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">新しい締切日</label>
              <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">補足（任意）</label>
              <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} className="min-h-16" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                変更を通知するユーザー（任意）
                {editUserIds.length > 0 && <span className="ml-2 admin-pill">{editUserIds.length}人</span>}
              </label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                {users.map((user) => (
                  <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--admin-50)]">
                    <input type="checkbox" checked={editUserIds.includes(user.id)} onChange={() => setEditUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} />
                    <span className="text-xs">{user.studentNumber ? `(${user.studentNumber}) ` : ''}{user.name}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setEditUserIds(users.map(u => u.id))} className="mt-2 w-full admin-outline">すべて選択</button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleSaveEditTask} className="flex-1 admin-btn">保存{editUserIds.length > 0 ? " + 通知" : ""}</button>
              <button type="button" onClick={() => setEditTarget(null)} className="text-xs text-[var(--muted)] px-3">キャンセル</button>
            </div>
          </div>
        </div>
      )}
      <div className="container-responsive py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/admin")} className="text-sm font-medium admin-link md:hidden">管理メニューへ戻る</button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">課題管理</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card h-fit">
            <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">新しい課題を追加</h2>
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">教科</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">教科を選択</option>
                  {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                {subjectError && <small className="text-xs text-red-600 mt-1 block">{subjectError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">課題タイトル</label>
                <input type="text" placeholder="例: 教科書 p.45 練習問題" value={title} onChange={(e) => setTitle(e.target.value)} />
                {titleError && <small className="text-xs text-red-600 mt-1 block">{titleError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">締切日</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                {dueDateError && <small className="text-xs text-red-600 mt-1 block">{dueDateError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">補足（任意）</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" placeholder="例: 教科書も持参すること" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">出席番号範囲（任意）</label>
                <div className="flex gap-2">
                  <input type="number" min="1" value={studentNumberFrom} onChange={(e) => setStudentNumberFrom(e.target.value)} placeholder="From" className="w-1/2" />
                  <input type="number" min="1" value={studentNumberTo} onChange={(e) => setStudentNumberTo(e.target.value)} placeholder="To" className="w-1/2" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  送信するユーザー
                  {selectedUserIds.length > 0 && <span className="ml-2 admin-pill">{selectedUserIds.length}人</span>}
                </label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
                  {users.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">ユーザーが登録されていません</p>
                  ) : (
                    users.map((user) => (
                      <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--admin-50)]">
                        <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleUserSelection(user.id)} className="cursor-pointer" />
                        <p className="text-xs font-medium text-[var(--foreground)]">{user.studentNumber ? `(${user.studentNumber}) ` : ''}{user.name}</p>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button type="button" onClick={() => setSelectedUserIds(users.map(u => u.id))} className="w-full admin-outline">すべて選択</button>
                <button type="submit" className="w-full admin-btn">追加 + メール送信</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">現在の課題一覧</h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">登録されている課題はありません。</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.batchId} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)]">【{task.subject}】{task.title}</p>
                      <p className="text-xs text-[var(--muted)]">締切: {new Date(task.dueDate).toLocaleDateString()} / 完了 {task.completedCount} / 配布 {task.assignedCount}</p>
                      {task.note && <p className="text-xs text-[var(--muted)] mt-0.5">補足: {task.note}</p>}
                    </div>
                    <button onClick={() => handleEditTask(task)} className="self-start text-xs font-medium text-[var(--admin-600)] hover:underline sm:shrink-0">締切変更</button>
                    <button onClick={() => { setResendTarget(task); setResendUserIds([]); }} className="self-start text-xs font-medium text-blue-500 hover:text-blue-700 sm:shrink-0">再送信</button>
                    <button onClick={() => handleDeleteTask(task.batchId)} className="self-start text-xs font-medium text-red-500 hover:text-red-700 sm:ml-2 sm:shrink-0">削除</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
