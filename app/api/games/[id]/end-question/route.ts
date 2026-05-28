import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getPusherServer } from '@/lib/pusher-server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = createServerClient();
  const pusher = getPusherServer();

  const { data: game, error: gameErr } = await db
    .from('games')
    .select('code, current_question_index, quizzes(questions(id, answer_options(*)))')
    .eq('id', id)
    .single();

  if (gameErr || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const qi = game.current_question_index;
  type QuizzesShape = { questions: { id: string; answer_options: { id: string; is_correct: boolean }[] }[] };
  const questions = (game.quizzes as unknown as QuizzesShape).questions;
  const currentQuestion = questions[qi];
  if (!currentQuestion) return NextResponse.json({ error: 'No active question' }, { status: 400 });

  const correctOptions = currentQuestion.answer_options.filter((o) => o.is_correct);
  if (correctOptions.length === 0) return NextResponse.json({ error: 'No correct answer defined' }, { status: 400 });

  // Fetch per-player scores for this question
  const { data: answers } = await db
    .from('player_answers')
    .select('points_earned, players(nickname, id)')
    .eq('question_id', currentQuestion.id);

  type PlayerRelation = { id: string; nickname: string };
  const scores = (answers ?? []).map((a) => ({
    playerId: (a.players as unknown as PlayerRelation).id,
    nickname: (a.players as unknown as PlayerRelation).nickname,
    pointsEarned: a.points_earned,
  }));

  // Top 5 overall leaderboard
  const { data: players } = await db
    .from('players')
    .select('nickname, total_score')
    .eq('game_id', id)
    .order('total_score', { ascending: false })
    .limit(5);

  await pusher.trigger(`game-${game.code}`, 'question-end', {
    correctOptionIds: correctOptions.map((o) => o.id),
    scores,
  });

  await pusher.trigger(`game-${game.code}`, 'leaderboard', {
    top5: players ?? [],
  });

  return NextResponse.json({ ok: true });
}
