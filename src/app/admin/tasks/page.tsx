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

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);

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

    Promise.all([fetch("/api/admin/tasks"), fetch("/api/admin/subjects")])
      .then(async ([tasksRes, subjectsRes]) => {
        if (!tasksRes.ok || !subjectsRes.ok) throw new Error();
        const nextTasks = (await tasksRes.json()) as Task[];
        const nextSubjects = (await subjectsRes.json()) as Subject[];
        return { nextTasks, nextSubjects };
      })
      .then(({ nextTasks, nextSubjects }) => {
        if (isMounted) {
          setTasks(nextTasks);
          setSubjects(nextSubjects);
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
    if (!subject || !title || !dueDate) return;

    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, title, dueDate }),
      });
      if (res.ok) {
        setSubject("");
        setTitle("");
        setDueDate("");
        fetchTasks();
      }
    } catch {
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
              >
                追加する
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-2">
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
