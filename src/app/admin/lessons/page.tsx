"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Lesson = { id: string; userId?: string | null; dayOfWeek: string; period: number; subject: string };
type SubjectItem = { id: string; name: string };

export default function AdminLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState("月");
  const [period, setPeriod] = useState(1);
  const [subject, setSubject] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetch('/api/admin/subjects'), fetch('/api/admin/lessons')])
      .then(async ([sRes, lRes]) => {
        if (!sRes.ok) throw new Error('unauth');
        const subjects = await sRes.json();
        const lessons = await lRes.json();
        if (mounted) {
          setSubjects(subjects);
          setLessons(lessons);
        }
      })
      .catch(() => router.push('/admin/login'))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError("");
    if (!subject) {
      setSubjectError('教科を選択してください。');
      return;
    }
    const res = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayOfWeek, period, subject }),
    });
    if (!res.ok) return alert('追加に失敗しました');
    const newLesson = await res.json();
    setLessons(prev => [...prev, newLesson]);
    setSubject('');
    setSubjectError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この時間割を削除しますか？')) return;
    const res = await fetch('/api/admin/lessons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!res.ok) return alert('削除に失敗しました');
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/admin')} className="text-sm text-indigo-600">管理メニューへ戻る</button>
          <h1 className="text-2xl font-bold">時間割管理</h1>
        </div>

        <div className="rounded-xl border bg-white p-5">
              <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="p-2 border rounded text-gray-800">
              {['月','火','水','木','金'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={period} onChange={e => setPeriod(parseInt(e.target.value))} className="p-2 border rounded text-gray-800">
              {[1,2,3,4].map(p => <option key={p} value={p}>{p}限</option>)}
            </select>
                <div className="flex gap-2">
              
                  <div className="flex-1">
                    <select value={subject} onChange={e => { setSubject(e.target.value); setSubjectError(""); }} className="w-full p-2 border rounded text-gray-800">
                      <option value="">— 教科を選択 —</option>
                      {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    {subjectError && <small className="text-xs text-red-600 mt-1">{subjectError}</small>}
                  </div>
                  <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded">追加</button>
                </div>
          </form>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-bold mb-3 text-gray-900">登録済み時間割</h2>
          {lessons.length === 0 ? <p className="text-sm text-gray-700">まだ登録がありません。</p> : (
            <ul className="space-y-2">
              {lessons.map(l => (
                <li key={l.id} className="flex items-center justify-between border p-2 rounded">
                  <div className="text-sm text-gray-800">{l.dayOfWeek} {l.period}限 — {l.subject} {l.userId ? `(user: ${l.userId})` : ''}</div>
                  <button
                    onClick={() => handleDelete(l.id)}
                    title="削除"
                    aria-label="削除"
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
