"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Task = { batchId: string; subject: string; title: string; dueDate: string; assignedCount: number; completedCount: number };
type Subject = { id: string; name: string };
type User = { id: string; name: string; email: string; createdAt: string };

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [subjectError, setSubjectError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dueDateError, setDueDateError] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [studentNumbersInput, setStudentNumbersInput] = useState("");

  const parseStudentNumbers = (input: string): number[] => {
    if (!input) return [];
    const parts = input.split(/[,\s]+/).map(p => p.trim()).filter(Boolean);
    const numbers = new Set<number>();
    for (const part of parts) {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(x => Number(x.trim()));
        if (!Number.isNaN(a) && !Number.isNaN(b)) {
          const start = Math.min(a, b);
          const end = Math.max(a, b);
          for (let i = start; i <= end; i++) numbers.add(i);
        }
      } else {
        const n = Number(part);
        if (!Number.isNaN(n)) numbers.add(n);
      }
    }
    return Array.from(numbers).sort((x, y) => x - y);
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tasks");
      if (!res.ok) throw new Error();
      setTasks((await res.json()) as Task[]);
    } catch {
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetch("/api/admin/tasks"), fetch("/api/admin/subjects"), fetch("/api/admin/users")])
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
      .catch(() => router.push("/admin/login"))
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, title, dueDate }),
    });
    if (!res.ok) { alert("追加に失敗しました。"); return; }

    if (selectedUserIds.length > 0) {
      const parsed = parseStudentNumbers(studentNumbersInput);
      const emailRes = await fetch("/api/admin/send-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "task", userIds: selectedUserIds, studentNumbers: parsed, payload: { taskTitle: title, dueDate } }),
      });
      if (!emailRes.ok) {
        const error = await emailRes.json().catch(() => ({ error: "Unknown error" }));
        alert(`メール送信に失敗しました: ${error.error}`);
      }
    }

    setSubject(""); setTitle(""); setDueDate(""); setSelectedUserIds([]);
    fetchTasks();
  };

  const handleDeleteTask = async (batchId: string) => {
    if (!confirm("この課題を削除してもよろしいですか？")) return;
    const res = await fetch("/api/admin/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId }),
    });
    if (res.ok) fetchTasks();
    else alert("削除に失敗しました。");
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      <div className="container-responsive py-6 space-y-6">
        <div className="flex items-center justify-between">
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
                        <p className="text-xs font-medium text-[var(--foreground)]">{user.name}</p>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">出席番号で指定（カンマ区切り、範囲可 例: 1,2,5-10）</label>
                <input value={studentNumbersInput} onChange={(e) => setStudentNumbersInput(e.target.value)} placeholder="例: 1,2,5-10" />
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
                  <div key={task.batchId} className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">【{task.subject}】{task.title}</p>
                      <p className="text-xs text-[var(--muted)]">締切: {new Date(task.dueDate).toLocaleDateString()} / 完了 {task.completedCount} / 配布 {task.assignedCount}</p>
                    </div>
                    <button onClick={() => handleDeleteTask(task.batchId)} className="text-xs font-medium text-red-500 hover:text-red-700 ml-2 shrink-0">削除</button>
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
