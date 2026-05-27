"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
};

type Lesson = {
  id: string;
  dayOfWeek: string; // e.g. '月','火','水','木','金'
  period: number;
  subject: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
};

type DashboardData = {
  tasks: Task[];
  announcements: Announcement[];
  lessons?: Lesson[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    tasks: [],
    announcements: [],
    lessons: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. データの読み込み
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          // もしトークンが切れていれば、Middlewareによって自動でここがエラーになるか、
          // あるいは401エラーが返ってきます。
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("データの取得に失敗しました。");
        }
        const json = (await res.json()) as DashboardData;
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  // 2. ログアウト処理
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      alert("ログアウトに失敗しました。");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">データを読み込み中...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCompleted: !isCompleted }),
    });

    if (!res.ok) {
      alert("更新に失敗しました。");
      return;
    }

    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, isCompleted: !isCompleted } : task
      ),
    }));
  };

  const incompleteTasks = data.tasks.filter((task) => !task.isCompleted);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">スクールライフ・ダッシュボード</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">課題の状況</h2>
            <span className="text-sm text-gray-700">
              未完了 {incompleteTasks.length} / 全 {data.tasks.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {data.tasks.length === 0 ? (
              <p className="text-sm text-gray-700">現在登録されている課題はありません。</p>
            ) : (
              data.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    task.isCompleted ? "border-gray-200 bg-gray-50" : "border-indigo-100 bg-white"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${task.isCompleted ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      【{task.subject}】{task.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      締切: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleTask(task.id, task.isCompleted)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      task.isCompleted
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {task.isCompleted ? "未完了に戻す" : "完了"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">時間割</h2>
          <div className="mt-4 overflow-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr>
                  <th className="w-20 p-2">時限</th>
                  {['月','火','水','木','金'].map(d => (
                    <th key={d} className="p-2 text-left">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, idx) => {
                  const period = idx + 1;
                  return (
                    <tr key={period} className="border-t">
                      <td className="p-2 font-medium">{period}限</td>
                      {['月','火','水','木','金'].map((d) => {
                        const lesson = data.lessons?.find(l => l.dayOfWeek === d && l.period === period);
                        return (
                          <td key={d} className="p-2 align-top">
                            {lesson ? (
                              <div className="rounded-sm bg-indigo-100 p-2 text-sm font-semibold text-indigo-900">{lesson.subject}</div>
                            ) : (
                              <div className="text-sm text-gray-600">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">日々の連絡</h2>
          <div className="mt-4 space-y-3">
            {data.announcements.length === 0 ? (
              <p className="text-sm text-gray-700">現在表示できる連絡はありません。</p>
            ) : (
              data.announcements.map((announcement) => (
                <article key={announcement.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900">{announcement.title}</h3>
                    <span className="shrink-0 text-xs text-gray-500">
                      {new Date(announcement.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{announcement.body}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
