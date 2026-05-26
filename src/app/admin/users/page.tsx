"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/users");
        if (!response.ok) {
          throw new Error("ユーザー情報の取得に失敗しました。");
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← 管理メニューに戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <div className="w-32" />
        </div>

        {loading && (
          <div className="rounded-lg bg-white p-6 text-center">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      名前
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      メールアドレス
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      登録日
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        ユーザーがまだ登録されていません。
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          合計: <span className="font-semibold">{users.length}</span> ユーザー
        </div>
      </div>
    </div>
  );
}
