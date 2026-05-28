'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !nickname.trim()) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/game/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), nickname: nickname.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Liitumine ebaõnnestus');
      setLoading(false);
      return;
    }

    const { playerId } = await res.json();
    sessionStorage.setItem('playerId', playerId);
    sessionStorage.setItem('nickname', nickname.trim());
    router.push(`/game/${code.trim()}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white mb-2">
            Data<span className="text-purple-400">hoot</span>
          </h1>
          <p className="text-gray-400">Sisesta mängu kood liitumiseks</p>
        </div>

        <form onSubmit={join} className="space-y-4">
          <input
            className="w-full bg-gray-800 text-white text-center text-3xl font-mono font-bold rounded-xl p-4 tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-600"
            placeholder="0000"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
          />
          <input
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
            placeholder="Sinu nimi"
            maxLength={30}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 4 || !nickname.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-lg"
          >
            {loading ? 'Liitun...' : 'Liitu'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Admin?{' '}
          <a href="/admin" className="text-gray-500 hover:text-gray-300 underline">
            Armatuurlaud
          </a>
        </p>
      </div>
    </div>
  );
}
