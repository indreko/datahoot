import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(req: NextRequest) {
  const db = createServerClient();
  const { quiz_id } = await req.json();

  // Verify quiz exists
  const { error: quizError } = await db.from('quizzes').select('id').eq('id', quiz_id).single();
  if (quizError) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

  // Generate unique code (retry on collision)
  let code = randomCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data } = await db.from('games').select('id').eq('code', code).maybeSingle();
    if (!data) break;
    code = randomCode();
  }

  const { data: game, error } = await db
    .from('games')
    .insert({ quiz_id, code })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(game, { status: 201 });
}
