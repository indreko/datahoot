import QuizEditor from '@/components/admin/QuizEditor';
import { createServerClient } from '@/lib/supabase-server';
import { QuizWithQuestions } from '@/types';

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServerClient();
  const { data } = await db
    .from('quizzes')
    .select('*, questions(*, answer_options(*))')
    .eq('id', id)
    .order('sort_order', { referencedTable: 'questions' })
    .order('sort_order', { referencedTable: 'questions.answer_options' })
    .single();

  return <QuizEditor initial={data as QuizWithQuestions} />;
}
