import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getPusherServer } from '@/lib/pusher-server';
import { triggerEndQuestion } from '@/lib/end-question';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = createServerClient();
  const pusher = getPusherServer();

  const { data: game, error } = await db
    .from('games')
    .select('code, current_question_index, quizzes(questions(id, sort_order))')
    .eq('id', id)
    .single();

  if (error || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  type QuizzesShape = { questions: { id: string; sort_order: number }[] };
  const questions = (game.quizzes as unknown as QuizzesShape).questions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const currentQuestion = questions[game.current_question_index];
  if (!currentQuestion) return NextResponse.json({ error: 'No active question' }, { status: 400 });

  await triggerEndQuestion(db, pusher, id, game.code, currentQuestion.id);

  return NextResponse.json({ ok: true });
}
