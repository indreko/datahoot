'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';

const TIMEOUT_S = 20;
const OPTION_COLORS = [
  'bg-red-500 hover:bg-red-400',
  'bg-blue-500 hover:bg-blue-400',
  'bg-yellow-500 hover:bg-yellow-400',
  'bg-green-500 hover:bg-green-400',
];
const OPTION_COLORS_BASE = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
const SHAPES = ['▲', '◆', '●', '■'];

type Phase = 'lobby' | 'question' | 'result' | 'leaderboard' | 'finished';

interface Option { id: string; text: string }
interface QuestionPayload {
  questionIndex: number;
  questionText: string | null;
  imageUrl: string | null;
  options: Option[];
  startsAt: string;
}
interface QuestionEndPayload {
  correctOptionIds: string[];
  scores: { playerId: string; nickname: string; pointsEarned: number }[];
}
interface LeaderboardPayload {
  top5: { nickname: string; totalScore: number }[];
}

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [phase, setPhase] = useState<Phase>('lobby');
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ nickname: string; totalScore: number }[]>([]);
  const [finalResults, setFinalResults] = useState<{ nickname: string; totalScore: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_S);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pid = sessionStorage.getItem('playerId');
    const name = sessionStorage.getItem('nickname');
    if (!pid || !name) { router.push('/'); return; }
    setPlayerId(pid);
    setNickname(name);
  }, [router]);

  useEffect(() => {
    if (!playerId) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${code}`);

    channel.bind('game-started', () => {
      // will get question-start next
    });

    channel.bind('question-start', (data: QuestionPayload) => {
      setQuestion(data);
      setSelectedId(null);
      setCorrectIds([]);
      setMyPoints(null);
      setPhase('question');
      startTimer(data.startsAt);
    });

    channel.bind('question-end', (data: QuestionEndPayload) => {
      clearTimer();
      setCorrectIds(data.correctOptionIds);
      const me = data.scores.find((s) => s.playerId === playerId);
      setMyPoints(me?.pointsEarned ?? 0);
      setPhase('result');
    });

    channel.bind('leaderboard', (data: LeaderboardPayload) => {
      setLeaderboard(data.top5);
      setPhase('leaderboard');
    });

    channel.bind('game-finished', (data: { final: { nickname: string; totalScore: number }[] }) => {
      setFinalResults(data.final);
      setPhase('finished');
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${code}`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, code]);

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startTimer(startsAt: string) {
    clearTimer();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startsAt).getTime()) / 1000);
      setTimeLeft(Math.max(0, TIMEOUT_S - elapsed));
    }, 250);
  }

  async function submitAnswer(optionId: string) {
    if (selectedId || !playerId) return;
    setSelectedId(optionId);

    const res = await fetch(`/api/game/${code}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, answerId: optionId }),
    });

    if (!res.ok) {
      const d = await res.json();
      if (d.error === 'Already answered') return;
    }
  }

  if (!playerId) return null;

  // LOBBY
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-purple-700 flex flex-col items-center justify-center text-white p-8">
        <h1 className="text-4xl font-black mb-2">Tere, {nickname}!</h1>
        <p className="text-purple-200 text-lg mb-8">Ootame mängu algust...</p>
        <div className="text-center">
          <div className="text-6xl font-mono font-black text-yellow-300">{code}</div>
          <div className="text-purple-200 text-sm mt-1">Mängu kood</div>
        </div>
        <div className="mt-12 animate-bounce text-purple-200 text-sm">Admin alustab mängu peagi</div>
      </div>
    );
  }

  // QUESTION
  if (phase === 'question' && question) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Progress bar */}
        <div
          className="h-2 bg-purple-500 transition-all duration-1000"
          style={{ width: `${(timeLeft / TIMEOUT_S) * 100}%` }}
        />

        <div className="flex-1 flex flex-col p-4">
          {/* Question */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-4">
            {question.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={question.imageUrl} alt="" className="max-h-40 mb-4 rounded-xl object-contain" />
            )}
            {question.questionText && (
              <p className="text-2xl font-semibold">{question.questionText}</p>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => submitAnswer(opt.id)}
                disabled={!!selectedId}
                className={`
                  ${selectedId
                    ? selectedId === opt.id
                      ? `${OPTION_COLORS_BASE[i]} ring-4 ring-white scale-95`
                      : `${OPTION_COLORS_BASE[i]} opacity-40`
                    : OPTION_COLORS[i]}
                  rounded-2xl p-5 text-lg font-bold text-white text-center
                  transition-all duration-150 flex items-center gap-3
                  disabled:cursor-not-allowed
                `}
              >
                <span className="text-2xl">{SHAPES[i]}</span>
                <span>{opt.text}</span>
              </button>
            ))}
          </div>

          {selectedId && (
            <p className="text-center text-gray-400 mt-4 text-sm animate-pulse">Vastus saadetud, oota tulemust...</p>
          )}
        </div>
      </div>
    );
  }

  // RESULT
  if (phase === 'result' && question && correctIds.length > 0) {
    const isCorrect = selectedId !== null && correctIds.includes(selectedId);
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center text-white p-8 ${isCorrect ? 'bg-green-700' : 'bg-red-800'}`}>
        <div className="text-7xl mb-4">{isCorrect ? '✓' : '✗'}</div>
        <h2 className="text-3xl font-bold mb-2">{isCorrect ? 'Õige!' : 'Vale!'}</h2>
        {myPoints !== null && isCorrect && (
          <div className="text-5xl font-black text-yellow-300 mb-2">+{myPoints}</div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-sm">
          {question.options.map((opt, i) => {
            const isOptCorrect = correctIds.includes(opt.id);
            const wasSelected = selectedId === opt.id;
            return (
              <div
                key={opt.id}
                className={`${OPTION_COLORS_BASE[i]} rounded-xl p-3 flex items-center gap-2
                  ${isOptCorrect ? 'ring-4 ring-white' : 'opacity-40'}
                `}
              >
                <span>{SHAPES[i]}</span>
                <span className="text-sm font-semibold flex-1">{opt.text}</span>
                {wasSelected && <span>{isOptCorrect ? '✓' : '✗'}</span>}
                {isOptCorrect && !wasSelected && <span className="text-white/70">✓</span>}
              </div>
            );
          })}
        </div>
        <p className="text-white/70 text-sm mt-4">Oota edetabelit...</p>
      </div>
    );
  }

  // LEADERBOARD
  if (phase === 'leaderboard') {
    const myRank = leaderboard.findIndex((p) => p.nickname === nickname);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
        <h2 className="text-3xl font-bold mb-6">Edetabel</h2>
        <ol className="w-full max-w-sm space-y-2 mb-6">
          {leaderboard.map((p, i) => (
            <li
              key={i}
              className={`rounded-xl px-4 py-3 flex justify-between items-center ${p.nickname === nickname ? 'bg-purple-600 ring-2 ring-white' : 'bg-gray-800'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{['🥇', '🥈', '🥉', '4.', '5.'][i]}</span>
                <span className="font-semibold">{p.nickname}</span>
              </div>
              <span className="font-mono text-yellow-400 font-bold">{p.totalScore}</span>
            </li>
          ))}
        </ol>
        {myRank === -1 && <p className="text-gray-400 text-sm">Sa pole veel top 5-s</p>}
        <p className="text-gray-500 text-sm animate-pulse mt-2">Oota järgmist küsimust...</p>
      </div>
    );
  }

  // FINISHED
  if (phase === 'finished') {
    const myPos = finalResults.findIndex((p) => p.nickname === nickname) + 1;
    const myScore = finalResults.find((p) => p.nickname === nickname)?.totalScore ?? 0;
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold mb-2">Mäng läbi!</h2>
        {myPos > 0 && (
          <p className="text-xl text-yellow-400 mb-6">{myPos}. koht · {myScore} punkti</p>
        )}
        <ol className="w-full max-w-sm space-y-2 mb-8">
          {finalResults.slice(0, 5).map((p, i) => (
            <li
              key={i}
              className={`rounded-xl px-4 py-3 flex justify-between items-center ${p.nickname === nickname ? 'bg-purple-600 ring-2 ring-white' : 'bg-gray-800'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{['🥇', '🥈', '🥉', '4.', '5.'][i]}</span>
                <span className="font-semibold">{p.nickname}</span>
              </div>
              <span className="font-mono text-yellow-400 font-bold">{p.totalScore}</span>
            </li>
          ))}
        </ol>
        <a href="/" className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold">
          Tagasi avalehele
        </a>
      </div>
    );
  }

  return null;
}
