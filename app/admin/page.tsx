'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Quiz } from '@/types';

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/quizzes')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setQuizzes(data);
        } else {
          setError(data?.error ?? 'Andmete laadimine ebaõnnestus');
        }
        setLoading(false);
      });
  }, []);

  async function deleteQuiz(id: string) {
    if (!confirm('Kustuta viktoriin?')) return;
    await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Datahoot Admin</h1>
          <Link
            href="/admin/quiz/new"
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold"
          >
            + Uus viktoriin
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400">Laadin...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : quizzes.length === 0 ? (
          <p className="text-gray-400">Viktoriine pole veel. Loo esimene!</p>
        ) : (
          <ul className="space-y-3">
            {quizzes.map((q) => (
              <li key={q.id} className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">{q.title}</p>
                  <p className="text-gray-400 text-sm">{new Date(q.created_at).toLocaleDateString('et')}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/quiz/${q.id}`}
                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg text-sm"
                  >
                    Muuda
                  </Link>
                  <Link
                    href={`/admin/quiz/${q.id}/run`}
                    className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-sm font-semibold"
                  >
                    Käivita
                  </Link>
                  <button
                    onClick={() => deleteQuiz(q.id)}
                    className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded-lg text-sm"
                  >
                    Kustuta
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
