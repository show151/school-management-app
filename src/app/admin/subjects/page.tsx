"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Subject = {
  id: string;
  name: string;
};

export default function AdminSubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const res = await fetch("/api/admin/subjects");
    if (!res.ok) {
      router.push("/admin/login");
      return;
    }
    setSubjects((await res.json()) as Subject[]);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    fetch("/api/admin/subjects")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<Subject[]>;
      })
      .then((data) => {
        if (isMounted) setSubjects(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      alert("教科の登録に失敗しました。");
      return;
    }

    setName("");
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この教科を削除しますか？")) return;

    const res = await fetch("/api/admin/subjects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      alert("教科の削除に失敗しました。");
      return;
    }

    reload();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            管理メニューへ戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">教科登録</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-gray-700">教科名</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
              placeholder="例: 数学"
            />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              登録
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-gray-800">登録済み教科</h2>
          {subjects.length === 0 ? (
            <p className="text-sm text-gray-500">まだ教科が登録されていません。</p>
          ) : (
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <span className="text-sm font-medium text-gray-900">{subject.name}</span>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
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
  );
}
