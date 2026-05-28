-- Viktoriinid
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Küsimused
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  question_text TEXT,
  image_url TEXT,
  CONSTRAINT has_content CHECK (question_text IS NOT NULL OR image_url IS NOT NULL)
);

-- Vastusevariandid (4 tk küsimuse kohta)
CREATE TABLE answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL
);

-- Mängud
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  code CHAR(4) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'finished')),
  current_question_index INT NOT NULL DEFAULT -1,
  question_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mängijad
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  total_score INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mängijate vastused
CREATE TABLE player_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  answer_option_id UUID NOT NULL REFERENCES answer_options(id),
  response_time_ms INT NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, question_id)
);

-- RPC: atomiline skoori suurendamine
CREATE OR REPLACE FUNCTION increment_player_score(p_player_id UUID, p_points INT)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE players
  SET total_score = total_score + p_points
  WHERE id = p_player_id;
$$;

-- Indeksid
CREATE INDEX ON questions (quiz_id, sort_order);
CREATE INDEX ON answer_options (question_id, sort_order);
CREATE INDEX ON players (game_id, total_score DESC);
CREATE INDEX ON player_answers (question_id);
CREATE INDEX ON games (code);
