"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  batchId: string;
  subject: string;
  title: string;
  dueDate: string;
  assignedCount: number;
  completedCount: number;
};

type Subject = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

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

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tasks");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Task[];
      setTasks(data);
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
        const nextTasks = (await tasksRes.json()) as Task[];
        const nextSubjects = (await subjectsRes.json()) as Subject[];
        const nextUsers = (await usersRes.json()) as User[];
        return { nextTasks, nextSubjects, nextUsers };
      })
      .then(({ nextTasks, nextSubjects, nextUsers }) => {
        if (isMounted) {
          setTasks(nextTasks);
          setSubjects(nextSubjects);
          setUsers(nextUsers);
        }
      })
      .catch(() => {
        router.push("/admin/login");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError(""); setTitleError(""); setDueDateError("");
    if (!subject) setSubjectError("教科を選択してください。");
    if (!title) setTitleError("課題タイトルを入力してください。");
    if (!dueDate) setDueDateError("締切日を入力してください。");
    if (!subject || !title || !dueDate) return;

    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, title, dueDate }),
      });
      if (res.ok) {
        const newTask = await res.json();
        
        // 選択されたユーザーにメール送信
        if (selectedUserIds.length > 0) {
          console.log("📧 Sending email to", selectedUserIds.length, "users");
          const payload = {
            type: "task",
            userIds: selectedUserIds,
            payload: {
              taskTitle: title,
              dueDate: dueDate,
            },
          };
          console.log("📤 Request payload:", JSON.stringify(payload, null, 2));

          const emailRes = await fetch("/api/admin/send-email", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (emailRes.ok) {
            const data = await emailRes.json();
            console.log("✅ Email sent:", data);
          } else {
            const error = await emailRes.json().catch(() => ({ error: 'Failed to parse error response' }));
            console.error("❌ Email send failed. Status:", emailRes.status, "Error:", error);
            const errorMsg = error.details ? `${error.error}: ${error.details}` : (error.error || 'Unknown error');
            alert(`メール送信に失敗しました: ${errorMsg}`);
          }
        }

        setSubject("");
        setTitle("");
        setDueDate("");
        setSelectedUserIds([]);
        fetchTasks();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("追加に失敗しました。");
    }
  };

  const handleDeleteTask = async (batchId: string) => {
    if (!confirm("この課題を削除してもよろしいですか？")) return;
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      if (res.ok) fetchTasks();
    } catch {
      alert("削除に失敗しました。");
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">課題管理</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* フォーム + ユーザー選択 */}
          <div className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-base font-bold text-gray-800">新しい課題を追加</h2>
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">教科</label>
                <select
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900"
                >
                  <option value="">教科を選択</option>
                  {subjects.map((subjectOption) => (
                    <option key={subjectOption.id} value={subjectOption.name}>
                      {subjectOption.name}
                    </option>
                  ))}
                </select>
                {subjectError && <small className="text-xs text-red-600 mt-1">{subjectError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">課題タイトル</label>
                <input
                  type="text"
                  required
                  placeholder="例: 教科書 p.45 練習問題"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 placeholder:text-gray-500"
                />
                {titleError && <small className="text-xs text-red-600 mt-1">{titleError}</small>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">締切日</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900"
                />
                {dueDateError && <small className="text-xs text-red-600 mt-1">{dueDateError}</small>}
              </div>

              {/* ユーザー選択 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  送信するユーザー
                  {selectedUserIds.length > 0 && (
                    <span className="ml-2 inline-block rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                      {selectedUserIds.length}人
                    </span>
                  )}
                </label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50 p-2">
                  {users.length === 0 ? (
                    <p className="text-xs text-gray-400">ユーザーが登録されていません</p>
                  ) : (
                    users.map((user) => (
                      <label key={user.id} className="flex cursor-pointer items-center space-x-2 rounded px-1 py-1 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <p className="font-medium text-gray-800">{user.name}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserIds(users.map(u => u.id))}
                  className="w-full rounded-lg border border-indigo-600 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
                >
                  すべて選択
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
                >
                  追加 + メール送信
                </button>
              </div>
            </form>
          </div>

          {/* 右: 現在の課題一覧 */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-base font-bold text-gray-800">現在の課題一覧</h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400">登録されている課題はありません。</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.batchId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          【{task.subject}】{task.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          締切: {new Date(task.dueDate).toLocaleDateString()} / 完了 {task.completedCount} / 配布 {task.assignedCount}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.batchId)}
                      className="p-1 text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
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
