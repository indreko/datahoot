import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = createServerClient();
  const { data, error } = await db
    .from('quizzes')
    .select('*, questions(*, answer_options(*))')
    .eq('id', id)
    .order('sort_order', { referencedTable: 'questions' })
    .order('sort_order', { referencedTable: 'questions.answer_options' })
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = createServerClient();
  const body = await req.json();
  const { title, questions } = body as {
    title: string;
    questions: {
      id?: string;
      question_text: string | null;
      image_url: string | null;
      sort_order: number;
      answer_options: { id?: string; option_text: string; is_correct: boolean; sort_order: number }[];
    }[];
  };

  await db.from('quizzes').update({ title }).eq('id', id);

  // Delete old questions and re-insert (simplest strategy for an editor)
  await db.from('questions').delete().eq('quiz_id', id);

  for (const q of questions) {
    const { data: question, error: qErr } = await db
      .from('questions')
      .insert({ quiz_id: id, sort_order: q.sort_order, question_text: q.question_text, image_url: q.image_url })
      .select()
      .single();

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    await db.from('answer_options').insert(
      q.answer_options.map((a) => ({
        question_id: question.id,
        option_text: a.option_text,
        is_correct: a.is_correct,
        sort_order: a.sort_order,
      })),
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = createServerClient();
  const { error } = await db.from('quizzes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
