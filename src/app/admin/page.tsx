"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ダッシュボードへ戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">管理メニュー</h1>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            ログアウト
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => router.push("/admin/users")}
            className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <span className="block text-base font-semibold text-gray-900">ユーザー管理</span>
            <span className="mt-1 block text-sm text-gray-500">
              登録済みユーザーの名前とメールアドレスを確認します。
            </span>
          </button>
          <button
            onClick={() => router.push("/admin/announcements")}
            className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <span className="block text-base font-semibold text-gray-900">日々の連絡</span>
            <span className="mt-1 block text-sm text-gray-500">
              通常ユーザーのダッシュボードに表示する連絡を登録します。
            </span>
          </button>
          <button
            onClick={() => router.push("/admin/subjects")}
            className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <span className="block text-base font-semibold text-gray-900">教科登録</span>
            <span className="mt-1 block text-sm text-gray-500">
              課題登録で使う教科名を管理します。
            </span>
          </button>
          <button
            onClick={() => router.push("/admin/tasks")}
            className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <span className="block text-base font-semibold text-gray-900">課題管理</span>
            <span className="mt-1 block text-sm text-gray-500">
              登録済みユーザー全員に課題を配布します。
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
