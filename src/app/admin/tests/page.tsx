"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Test = {
  id: string;
  subject: string;
  period: number;
  range: string;
  testDate: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export default function AdminTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subject, setSubject] = useState("");
  const [period, setPeriod] = useState("");
  const [range, setRange] = useState("");
  const [testDate, setTestDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetch("/api/admin/tests"), fetch("/api/admin/users")])
      .then(async ([testsRes, usersRes]) => {
        if (!testsRes.ok || !usersRes.ok) throw new Error();
        const nextTests = (await testsRes.json()) as Test[];
        const nextUsers = (await usersRes.json()) as User[];
        return { nextTests, nextUsers };
      })
      .then(({ nextTests, nextUsers }) => {
        if (isMounted) {
          setTests(nextTests);
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

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !period || !range || !testDate) return;

    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, period: parseInt(period), range, testDate }),
      });
      if (res.ok) {
        const newTest = await res.json();

        // 選択されたユーザーにメール送信
        if (selectedUserIds.length > 0) {
          console.log("📧 Sending email to", selectedUserIds.length, "users");
          const payload = {
            type: "test",
            userIds: selectedUserIds,
            payload: {
              subject: subject,
              testDate: testDate,
              range: range,
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
        setPeriod("");
        setRange("");
        setTestDate("");
        setSelectedUserIds([]);

        // テスト一覧を再取得
        const testsRes = await fetch("/api/admin/tests");
        if (testsRes.ok) {
          setTests(await testsRes.json());
        }
      }
    } catch (error) {
      console.error("Error:", error);
      alert("追加に失敗しました。");
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm("このテスト情報を削除してもよろしいですか？")) return;
    try {
      const res = await fetch("/api/admin/tests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setTests(tests.filter(t => t.id !== id));
      }
    } catch {
      alert("削除に失敗しました。");
    }
  };

  const toggleUserSelection = (userId: number) => {
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
          <h1 className="text-2xl font-bold text-gray-900">テスト情報管理</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* フォーム + ユーザー選択 */}
          <div className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-base font-bold text-gray-800">新しいテストを追加</h2>
            <form onSubmit={handleAddTest} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">教科</label>
                <input
                  type="text"
                  required
                  placeholder="例: 数学"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">時限</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="例: 1"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">範囲</label>
                <input
                  type="text"
                  required
                  placeholder="例: 第1章～第3章"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">テスト日時</label>
                <input
                  type="datetime-local"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900"
                />
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

          {/* 右: 現在のテスト一覧 */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-base font-bold text-gray-800">現在のテスト一覧</h2>
            {tests.length === 0 ? (
              <p className="text-sm text-gray-400">登録されているテストはありません。</p>
            ) : (
              <div className="space-y-2">
                {tests.map((test) => (
                  <div key={test.id} className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-3 transition">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        【{test.subject}】{test.period}時限
                      </p>
                      <p className="text-xs text-gray-500">
                        範囲: {test.range}
                      </p>
                      <p className="text-xs text-gray-500">
                        日時: {new Date(test.testDate).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTest(test.id)}
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
