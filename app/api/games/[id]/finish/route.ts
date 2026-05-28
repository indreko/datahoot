import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getPusherServer } from '@/lib/pusher-server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = createServerClient();
  const pusher = getPusherServer();

  const { data: game, error } = await db.from('games').select('code').eq('id', id).single();
  if (error || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  await db.from('games').update({ status: 'finished' }).eq('id', id);

  const { data: players } = await db
    .from('players')
    .select('nickname, total_score')
    .eq('game_id', id)
    .order('total_score', { ascending: false });

  await pusher.trigger(`game-${game.code}`, 'game-finished', {
    final: players ?? [],
  });

  return NextResponse.json({ ok: true });
}
