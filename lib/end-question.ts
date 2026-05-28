import { SupabaseClient } from '@supabase/supabase-js';
import Pusher from 'pusher';

export async function triggerEndQuestion(
  db: SupabaseClient,
  pusher: Pusher,
  gameId: string,
  gameCode: string,
  questionId: string,
) {
  const { data: questionData } = await db
    .from('questions')
    .select('answer_options(*)')
    .eq('id', questionId)
    .single();

  if (!questionData) return;

  type Option = { id: string; is_correct: boolean };
  const correctOptions = (questionData.answer_options as Option[]).filter((o) => o.is_correct);
  if (correctOptions.length === 0) return;

  const { data: answers } = await db
    .from('player_answers')
    .select('points_earned, players(nickname, id)')
    .eq('question_id', questionId);

  type PlayerRelation = { id: string; nickname: string };
  const scores = (answers ?? []).map((a) => ({
    playerId: (a.players as unknown as PlayerRelation).id,
    nickname: (a.players as unknown as PlayerRelation).nickname,
    pointsEarned: a.points_earned,
  }));

  const { data: leaderboard } = await db
    .from('players')
    .select('nickname, total_score')
    .eq('game_id', gameId)
    .order('total_score', { ascending: false })
    .limit(5);

  await pusher.trigger(`game-${gameCode}`, 'question-end', {
    correctOptionIds: correctOptions.map((o) => o.id),
    scores,
  });

  await pusher.trigger(`game-${gameCode}`, 'leaderboard', {
    top5: leaderboard ?? [],
  });
}
