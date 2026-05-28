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
    .select('*, quizzes(id, questions(*, answer_options(*)))')
    .eq('id', id)
    .single();

  if (gameErr || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  type QuizzesShape = { questions: { id: string; sort_order: number; question_text: string | null; image_url: string | null; answer_options: { id: string; option_text: string; is_correct: boolean; sort_order: number }[] }[] };
  const questions = (game.quizzes as unknown as QuizzesShape).questions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const nextIndex = game.current_question_index + 1;

  if (nextIndex >= questions.length) {
    return NextResponse.json({ error: 'No more questions' }, { status: 400 });
  }

  const now = new Date().toISOString();

  await db
    .from('games')
    .update({ current_question_index: nextIndex, question_started_at: now, status: 'active' })
    .eq('id', id);

  const q = questions[nextIndex];
  const options = q.answer_options
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({ id: o.id, text: o.option_text }));

  await pusher.trigger(`game-${game.code}`, 'question-start', {
    questionIndex: nextIndex,
    questionText: q.question_text,
    imageUrl: q.image_url,
    options,
    startsAt: now,
  });

  // Schedule auto-end after 20s via a fire-and-forget mechanism
  // (handled client-side on admin panel; server-side timeout via answer route)

  return NextResponse.json({ questionIndex: nextIndex, startsAt: now });
}
