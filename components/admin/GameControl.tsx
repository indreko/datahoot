'use client';

import { useEffect, useRef, useState } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import { Game, QuizWithQuestions } from '@/types';

const TIMEOUT_S = 20;
const OPTION_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];

type Phase = 'lobby' | 'question' | 'results' | 'finished';

interface Props {
  game: Game;
  quiz: QuizWithQuestions;
}

export default function GameControl({ game, quiz }: Props) {
  const [playerCount, setPlayerCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('lobby');
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [answered, setAnswered] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_S);
  const [leaderboard, setLeaderboard] = useState<{ nickname: string; totalScore: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(0);

  const questions = quiz.questions.slice().sort((a, b) => a.sort_order - b.sort_order);
  const currentQuestion = questionIndex >= 0 ? questions[questionIndex] : null;

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${game.code}`);

    channel.bind('player-joined', (data: { nickname: string; playerCount: number }) => {
      setPlayerCount(data.playerCount);
    });

    channel.bind('answer-count', (data: { answered: number; total: number }) => {
      setAnswered(data.answered);
      setTotal(data.total);
    });

    channel.bind('question-end', () => {
      // Server triggered end (all answered or admin pressed button)
      clearTimer();
      setPhase('results');
    });

    channel.bind('leaderboard', (data: { top5: { nickname: string; totalScore: number }[] }) => {
      setLeaderboard(data.top5);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${game.code}`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.code]);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    clearTimer();
    setTimeLeft(TIMEOUT_S);
    questionStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000);
      const left = Math.max(0, TIMEOUT_S - elapsed);
      setTimeLeft(left);
      if (left === 0) {
        clearTimer();
        void handleEndQuestion();
      }
    }, 250);
  }

  async function handleStartGame() {
    setLoading(true);
    await fetch(`/api/games/${game.id}/next`, { method: 'POST' });
    setQuestionIndex(0);
    setAnswered(0);
    setPhase('question');
    startTimer();
    setLoading(false);
  }

  async function handleNextQuestion() {
    setLoading(true);
    const nextIdx = questionIndex + 1;
    if (nextIdx >= questions.length) {
      await fetch(`/api/games/${game.id}/finish`, { method: 'POST' });
      setPhase('finished');
      setLoading(false);
      return;
    }
    await fetch(`/api/games/${game.id}/next`, { method: 'POST' });
    setQuestionIndex(nextIdx);
    setAnswered(0);
    setPhase('question');
    startTimer();
    setLoading(false);
  }

  async function handleEndQuestion() {
    if (phase !== 'question') return;
    clearTimer();
    // phase transitions via 'question-end' Pusher event that server sends
    await fetch(`/api/games/${game.id}/end-question`, { method: 'POST' });
  }

  const isLastQuestion = questionIndex >= questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <div className="text-center">
            <div className="text-5xl font-mono font-black text-yellow-400">{game.code}</div>
            <div className="text-gray-400 text-sm">Liitumiskood</div>
          </div>
        </div>

        {/* LOBBY */}
        {phase === 'lobby' && (
          <div className="text-center py-12">
            <div className="text-6xl font-bold mb-2">{playerCount}</div>
            <div className="text-gray-400 mb-8">mängijat liitunud</div>
            <div className="text-gray-500 mb-8">
              {questions.length} küsimust · Mängijad liituvad aadressil <strong>datahoot.vercel.app</strong>
            </div>
            <button
              onClick={handleStartGame}
              disabled={loading || playerCount === 0}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-black px-10 py-4 rounded-2xl text-xl"
            >
              {loading ? 'Alustan...' : 'Alusta mängu'}
            </button>
          </div>
        )}

        {/* QUESTION */}
        {phase === 'question' && currentQuestion && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">
                Küsimus {questionIndex + 1} / {questions.length}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">{answered}/{total} vastanud</span>
                <div
                  className={`text-4xl font-mono font-black w-14 text-center ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}
                >
                  {timeLeft}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 mb-4 text-center">
              {currentQuestion.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentQuestion.image_url} alt="" className="max-h-48 mx-auto mb-4 rounded-lg object-contain" />
              )}
              <p className="text-2xl font-semibold">{currentQuestion.question_text}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentQuestion.answer_options
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((opt, i) => (
                  <div key={opt.id} className={`${OPTION_COLORS[i]} rounded-xl p-4 font-semibold text-lg`}>
                    {opt.option_text}
                  </div>
                ))}
            </div>

            <button
              onClick={handleEndQuestion}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 py-3 rounded-xl font-bold"
            >
              Lõpeta küsimus
            </button>
          </div>
        )}

        {/* RESULTS / LEADERBOARD */}
        {phase === 'results' && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Edetabel</h2>
            <ol className="space-y-2 mb-8">
              {leaderboard.map((p, i) => (
                <li key={i} className="bg-gray-800 rounded-xl px-5 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{['🥇', '🥈', '🥉', '4.', '5.'][i]}</span>
                    <span className="font-semibold">{p.nickname}</span>
                  </div>
                  <span className="font-mono text-yellow-400 font-bold">{p.totalScore}</span>
                </li>
              ))}
            </ol>
            <button
              onClick={handleNextQuestion}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-xl font-bold text-lg"
            >
              {loading ? 'Laadin...' : isLastQuestion ? 'Lõpeta mäng' : 'Järgmine küsimus'}
            </button>
          </div>
        )}

        {/* FINISHED */}
        {phase === 'finished' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold mb-6">Mäng läbi!</h2>
            <ol className="space-y-2 mb-8 text-left">
              {leaderboard.map((p, i) => (
                <li key={i} className="bg-gray-800 rounded-xl px-5 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{['🥇', '🥈', '🥉', '4.', '5.'][i]}</span>
                    <span className="font-semibold">{p.nickname}</span>
                  </div>
                  <span className="font-mono text-yellow-400 font-bold">{p.totalScore}</span>
                </li>
              ))}
            </ol>
            <a href="/admin" className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold">
              Tagasi armatuurlauale
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
