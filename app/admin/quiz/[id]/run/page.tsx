import { createServerClient } from '@/lib/supabase-server';
import { Game, QuizWithQuestions } from '@/types';
import GameControl from '@/components/admin/GameControl';
import { redirect } from 'next/navigation';

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default async function RunGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServerClient();

  const { data: quiz } = await db
    .from('quizzes')
    .select('*, questions(*, answer_options(*))')
    .eq('id', id)
    .order('sort_order', { referencedTable: 'questions' })
    .order('sort_order', { referencedTable: 'questions.answer_options' })
    .single();

  if (!quiz) redirect('/admin');

  // Generate unique 4-digit code
  let code = randomCode();
  for (let i = 0; i < 10; i++) {
    const { data } = await db.from('games').select('id').eq('code', code).maybeSingle();
    if (!data) break;
    code = randomCode();
  }

  const { data: game, error } = await db
    .from('games')
    .insert({ quiz_id: id, code })
    .select()
    .single();

  if (error || !game) redirect('/admin');

  return <GameControl game={game as Game} quiz={quiz as QuizWithQuestions} />;
}
