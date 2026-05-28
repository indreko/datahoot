import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getPusherServer } from '@/lib/pusher-server';
import { calcPoints } from '@/lib/scoring';
import { triggerEndQuestion } from '@/lib/end-question';

type Params = { params: Promise<{ code: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const db = createServerClient();
  const pusher = getPusherServer();
  const { playerId, answerId } = await req.json();

  const { data: game, error: gameErr } = await db
    .from('games')
    .select('id, status, current_question_index, question_started_at, quizzes(questions(id, sort_order, answer_options(*)))')
    .eq('code', code)
    .single();

  if (gameErr || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (game.status !== 'active') return NextResponse.json({ error: 'Game not active' }, { status: 409 });

  type QuizzesShape = { questions: { id: string; sort_order: number; answer_options: { id: string; is_correct: boolean }[] }[] };
  const questions = (game.quizzes as unknown as QuizzesShape)
    .questions.slice().sort((a, b) => a.sort_order - b.sort_order);

  const currentQuestion = questions[game.current_question_index];
  if (!currentQuestion) return NextResponse.json({ error: 'No active question' }, { status: 400 });

  // Prevent duplicate answers
  const { data: existing } = await db
    .from('player_answers')
    .select('id')
    .eq('player_id', playerId)
    .eq('question_id', currentQuestion.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'Already answered' }, { status: 409 });

  const responseTimeMs = game.question_started_at
    ? Date.now() - new Date(game.question_started_at).getTime()
    : 20_000;

  const clampedTime = Math.min(responseTimeMs, 20_000);
  const selectedOption = currentQuestion.answer_options.find((o) => o.id === answerId);
  const isCorrect = selectedOption?.is_correct ?? false;
  const points = calcPoints(clampedTime, isCorrect);

  await db.from('player_answers').insert({
    player_id: playerId,
    question_id: currentQuestion.id,
    answer_option_id: answerId,
    response_time_ms: clampedTime,
    points_earned: points,
  });

  await db.rpc('increment_player_score', { p_player_id: playerId, p_points: points });

  // Count how many players have answered
  const { count: answeredCount } = await db
    .from('player_answers')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', currentQuestion.id);

  const { count: totalPlayers } = await db
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id);

  const answered = answeredCount ?? 0;
  const total = totalPlayers ?? 0;

  await pusher.trigger(`game-${code}`, 'answer-count', { answered, total });

  // Kõik vastasid — lõpeta küsimus automaatselt
  if (total > 0 && answered >= total) {
    await triggerEndQuestion(db, pusher, game.id, code, currentQuestion.id);
  }

  return NextResponse.json({ points, isCorrect });
}
