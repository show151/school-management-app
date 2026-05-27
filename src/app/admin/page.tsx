"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      <div className="container-responsive py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">管理メニュー</h1>
          <button
            onClick={handleLogout}
            className="rounded-xl bg-[var(--card)] border px-3 py-1.5 text-sm font-medium text-[var(--admin-600)] hover:bg-[var(--admin-50)] transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            ログアウト
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button onClick={() => router.push("/admin/users")} className="card text-left transition hover:border-[var(--admin-600)] hover:bg-[var(--admin-50)]">
            <span className="block text-base font-semibold text-[var(--foreground)]">ユーザー管理</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">登録済みユーザーの名前とメールアドレスを確認します。</span>
          </button>
          <button onClick={() => router.push("/admin/announcements")} className="card text-left transition hover:border-[var(--admin-600)] hover:bg-[var(--admin-50)]">
            <span className="block text-base font-semibold text-[var(--foreground)]">日々の連絡</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">通常ユーザーのダッシュボードに表示する連絡を登録します。</span>
          </button>
          <button onClick={() => router.push("/admin/subjects")} className="card text-left transition hover:border-[var(--admin-600)] hover:bg-[var(--admin-50)]">
            <span className="block text-base font-semibold text-[var(--foreground)]">教科登録</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">課題登録で使う教科名を管理します。</span>
          </button>
          <button onClick={() => router.push("/admin/lessons")} className="card text-left transition hover:border-[var(--admin-600)] hover:bg-[var(--admin-50)]">
            <span className="block text-base font-semibold text-[var(--foreground)]">時間割管理</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">生徒の時間割を登録・編集します（1〜4限）。</span>
          </button>
          <button onClick={() => router.push("/admin/tasks")} className="card text-left transition hover:border-[var(--admin-600)] hover:bg-[var(--admin-50)]">
            <span className="block text-base font-semibold text-[var(--foreground)]">課題管理</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">登録済みユーザー全員に課題を配布します。</span>
          </button>
          <button onClick={() => router.push("/admin/tests")} className="card text-left transition hover:border-[var(--admin-600)] hover:bg-[var(--admin-50)]">
            <span className="block text-base font-semibold text-[var(--foreground)]">テスト管理</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">テスト日程・範囲を登録し、生徒に通知します。</span>
          </button>
        </div>
      </div>
    </div>
  );
}
