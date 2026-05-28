import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  const db = createServerClient();
  const { data, error } = await db
    .from('quizzes')
    .select('id, title, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = createServerClient();
  const body = await req.json();
  const { title, questions } = body as {
    title: string;
    questions: {
      question_text: string | null;
      image_url: string | null;
      sort_order: number;
      answer_options: { option_text: string; is_correct: boolean; sort_order: number }[];
    }[];
  };

  const { data: quiz, error: quizError } = await db
    .from('quizzes')
    .insert({ title })
    .select()
    .single();

  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 });

  for (const q of questions) {
    const { data: question, error: qErr } = await db
      .from('questions')
      .insert({ quiz_id: quiz.id, sort_order: q.sort_order, question_text: q.question_text, image_url: q.image_url })
      .select()
      .single();

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    const { error: aErr } = await db.from('answer_options').insert(
      q.answer_options.map((a) => ({ ...a, question_id: question.id })),
    );
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  return NextResponse.json(quiz, { status: 201 });
}
