import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getPusherServer } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  const db = createServerClient();
  const pusher = getPusherServer();
  const { code, nickname } = await req.json();

  if (!code || !nickname) {
    return NextResponse.json({ error: 'code and nickname required' }, { status: 400 });
  }

  const { data: game, error: gameErr } = await db
    .from('games')
    .select('id, code, status')
    .eq('code', String(code).trim())
    .single();

  if (gameErr || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (game.status !== 'waiting') return NextResponse.json({ error: 'Game already started' }, { status: 409 });

  const { data: player, error: playerErr } = await db
    .from('players')
    .insert({ game_id: game.id, nickname: String(nickname).trim().slice(0, 30) })
    .select()
    .single();

  if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 500 });

  const { count } = await db
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id);

  await pusher.trigger(`game-${game.code}`, 'player-joined', {
    nickname: player.nickname,
    playerCount: count ?? 1,
  });

  return NextResponse.json({ playerId: player.id, gameId: game.id, code: game.code }, { status: 201 });
}
