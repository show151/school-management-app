"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const handleBackupDownload = async () => {
    const response = await fetch('/api/admin/backup', { credentials: 'same-origin' });

    if (!response.ok) {
      alert('バックアップの取得に失敗しました。');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `school-management-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "same-origin" });
    // Force full reload so server-side header reflects logged-out state
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background admin-theme">
      <div className="container-responsive py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">管理メニュー</h1>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-(--border) bg-(--card) px-3 py-1.5 text-sm font-medium text-(--admin-600) transition-colors hover:bg-(--admin-50)"
          >
            ログアウト
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button onClick={() => router.push("/admin/users")} className="card text-left transition hover:border-(--admin-600) hover:bg-(--admin-50)">
            <span className="block text-base font-semibold text-foreground">ユーザー管理</span>
            <span className="mt-1 block text-sm text-(--muted)">登録済みユーザーの名前とメールアドレスを確認します。</span>
          </button>
          <button onClick={() => router.push("/admin/announcements")} className="card text-left transition hover:border-(--admin-600) hover:bg-(--admin-50)">
            <span className="block text-base font-semibold text-foreground">日々の連絡</span>
            <span className="mt-1 block text-sm text-(--muted)">通常ユーザーのダッシュボードに表示する連絡を登録します。</span>
          </button>
          <button onClick={() => router.push("/admin/subjects")} className="card text-left transition hover:border-(--admin-600) hover:bg-(--admin-50)">
            <span className="block text-base font-semibold text-foreground">教科登録</span>
            <span className="mt-1 block text-sm text-(--muted)">課題登録で使う教科名を管理します。</span>
          </button>
          <button onClick={() => router.push("/admin/daily-links")} className="card text-left transition hover:border-(--admin-600) hover:bg-(--admin-50)">
            <span className="block text-base font-semibold text-foreground">リンク管理</span>
            <span className="mt-1 block text-sm text-(--muted)">通常ユーザーのダッシュボードに表示するリンクを管理します。</span>
          </button>
          <button onClick={() => router.push("/admin/lessons")} className="card text-left transition hover:border-(--admin-600) hover:bg-(--admin-50)">
            <span className="block text-base font-semibold text-foreground">時間割管理</span>
            <span className="mt-1 block text-sm text-(--muted)">生徒の時間割を登録・編集します（1〜4限）。</span>
          </button>
          <button onClick={() => router.push("/admin/tasks")} className="card text-left transition hover:border-(--admin-600) hover:bg-(--admin-50)">
            <span className="block text-base font-semibold text-foreground">課題管理</span>
            <span className="mt-1 block text-sm text-(--muted)">登録済みユーザー全員に課題を配布します。</span>
          </button>
          <button onClick={() => router.push("/admin/tests")} className="card text-left transition hover:border-(--admin-600) hover:bg-(--admin-50)">
            <span className="block text-base font-semibold text-foreground">テスト管理</span>
            <span className="mt-1 block text-sm text-(--muted)">テスト日程・範囲を登録し、生徒に通知します。</span>
          </button>
          <button onClick={handleBackupDownload} className="card text-left transition hover:border-(--admin-600) hover:bg-(--admin-50)">
            <span className="block text-base font-semibold text-foreground">データバックアップ</span>
            <span className="mt-1 block text-sm text-(--muted)">登録データを JSON で書き出して保存できます。</span>
          </button>
        </div>
      </div>
    </div>
  );
}
