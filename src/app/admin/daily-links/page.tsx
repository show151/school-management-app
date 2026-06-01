"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DailyLink = {
  id: string;
  label: string;
  description: string | null;
  href: string;
  sortOrder: number;
};

type FormState = {
  id: string | null;
  label: string;
  description: string;
  href: string;
  sortOrder: string;
};

const INITIAL_FORM: FormState = {
  id: null,
  label: "",
  description: "",
  href: "",
  sortOrder: "0",
};

export default function AdminDailyLinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<DailyLink[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reload = async () => {
    const res = await fetch("/api/admin/daily-links", { credentials: "same-origin" });
    if (!res.ok) {
      router.push("/");
      return;
    }
    setLinks((await res.json()) as DailyLink[]);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/daily-links", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<DailyLink[]>;
      })
      .then((data) => {
        if (isMounted) setLinks(data);
      })
      .catch(() => router.push("/"))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [router]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setError("");
  };

  const handleEdit = (link: DailyLink) => {
    setForm({
      id: link.id,
      label: link.label,
      description: link.description ?? "",
      href: link.href,
      sortOrder: String(link.sortOrder),
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.label.trim()) {
      setError("リンク名を入力してください。");
      return;
    }
    if (!form.href.trim()) {
      setError("URLを入力してください。");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/daily-links", {
        method: form.id ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          label: form.label,
          description: form.description,
          href: form.href,
          sortOrder: Number(form.sortOrder || 0),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "リンクの保存に失敗しました。");
      }

      resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "リンクの保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このリンクを削除しますか？")) return;

    const res = await fetch("/api/admin/daily-links", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      alert("リンクの削除に失敗しました。");
      return;
    }
    reload();
  };

  if (loading) return <div className="p-8 text-center text-[var(--muted)]">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)] admin-theme">
      <div className="container-responsive py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/admin")} className="text-sm font-medium admin-link md:hidden">
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">リンク管理</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.4fr_96px]">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">リンク名</label>
              <input
                value={form.label}
                onChange={(e) => setForm((cur) => ({ ...cur, label: e.target.value }))}
                placeholder="例: 学校ポータル"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">URL</label>
              <input
                type="url"
                value={form.href}
                onChange={(e) => setForm((cur) => ({ ...cur, href: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">表示順</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((cur) => ({ ...cur, sortOrder: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">説明（任意）</label>
            <input
              value={form.description}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder="例: 出欠・成績・連絡の確認"
            />
          </div>

          {error && <div className="rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="admin-btn disabled:opacity-60">
              {saving ? "保存中..." : form.id ? "更新" : "追加"}
            </button>
            {form.id && (
              <button type="button" onClick={resetForm} className="admin-outline">
                キャンセル
              </button>
            )}
          </div>
        </form>

        <div className="card">
          <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">登録済みリンク</h2>
          {links.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">まだリンクが登録されていません。</p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div key={link.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">{link.sortOrder}</span>
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--admin)]">
                        {link.label}
                      </a>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">{link.href}</p>
                    {link.description && <p className="mt-1 text-xs text-[var(--muted)]">{link.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(link)} className="admin-outline">
                      編集
                    </button>
                    <button onClick={() => handleDelete(link.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
