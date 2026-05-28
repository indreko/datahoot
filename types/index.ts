export type GameStatus = 'waiting' | 'active' | 'finished';

export interface Quiz {
  id: string;
  title: string;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  sort_order: number;
  question_text: string | null;
  image_url: string | null;
}

export interface AnswerOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuestionWithOptions extends Question {
  answer_options: AnswerOption[];
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithOptions[];
}

export interface Game {
  id: string;
  quiz_id: string;
  code: string;
  status: GameStatus;
  current_question_index: number;
  question_started_at: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  nickname: string;
  total_score: number;
  joined_at: string;
}

export interface PlayerAnswer {
  id: string;
  player_id: string;
  question_id: string;
  answer_option_id: string;
  response_time_ms: number;
  points_earned: number;
  answered_at: string;
}

// Pusher event payloads
export interface PlayerJoinedPayload {
  nickname: string;
  playerCount: number;
}

export interface QuestionStartPayload {
  questionIndex: number;
  questionText: string | null;
  imageUrl: string | null;
  options: { id: string; text: string }[];
  startsAt: string; // ISO timestamp
}

export interface AnswerCountPayload {
  answered: number;
  total: number;
}

export interface QuestionEndPayload {
  correctOptionIds: string[];
  scores: { playerId: string; nickname: string; pointsEarned: number }[];
}

export interface LeaderboardPayload {
  top5: { nickname: string; totalScore: number }[];
}

export interface GameFinishedPayload {
  final: { nickname: string; totalScore: number }[];
}
