-- 게임화 기능을 위한 테이블 추가

-- 사용자 통계 테이블
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 배지 정의 테이블
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 배지 획득 기록 테이블
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  UNIQUE(user_id, badge_id)
);

-- sessions 테이블에 user_id 추가 (이미 있으면 스킵)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sessions' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_score ON user_stats(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- sessions 테이블의 user_id 인덱스 생성 (컬럼이 존재할 때만)
-- DO 블록 밖에서 조건부로 실행
DO $$ 
DECLARE
  column_exists BOOLEAN;
  index_exists BOOLEAN;
BEGIN
  -- 컬럼 존재 여부 확인
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'sessions' 
    AND column_name = 'user_id'
  ) INTO column_exists;
  
  -- 인덱스 존재 여부 확인
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND indexname = 'idx_sessions_user_id'
  ) INTO index_exists;
  
  -- 컬럼이 있고 인덱스가 없으면 생성
  IF column_exists AND NOT index_exists THEN
    EXECUTE 'CREATE INDEX idx_sessions_user_id ON public.sessions(user_id)';
  END IF;
END $$;

-- Row Level Security 활성화
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정

-- user_stats: 사용자는 자신의 통계만 읽고 쓸 수 있음
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- badges: 모든 사용자가 읽을 수 있음
CREATE POLICY "Anyone can view badges" ON badges
  FOR SELECT USING (true);

-- user_badges: 사용자는 자신의 배지만 읽을 수 있음, 모든 사용자가 리더보드를 위해 통계는 볼 수 있음
CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 리더보드를 위한 공개 읽기 정책 (익명 사용자도 리더보드 볼 수 있음)
CREATE POLICY "Anyone can view stats for leaderboard" ON user_stats
  FOR SELECT USING (true);

-- 초기 배지 데이터 삽입
INSERT INTO badges (id, name, description, icon, condition_type, condition_value) VALUES
  ('first-step', '첫 걸음', '첫 번째 세션을 완료했습니다', '🎯', 'first_session', '{}'),
  ('perfectionist', '완벽주의자', '100점 만점을 달성했습니다', '💯', 'perfect_score', '{"score": 100}'),
  ('enthusiast', '열정가', '10개의 세션을 완료했습니다', '🔥', 'session_count', '{"count": 10}'),
  ('master', '마스터', '모든 시나리오를 완료했습니다', '👑', 'all_scenarios', '{}'),
  ('streak-3', '연속 출석', '3일 연속으로 사용했습니다', '📅', 'streak', '{"days": 3}'),
  ('empathy-king', '공감왕', '공감 점수 평균 90점 이상을 달성했습니다', '❤️', 'avg_score', '{"type": "empathy", "score": 90}'),
  ('problem-solver', '해결사', '문제 해결 점수 평균 90점 이상을 달성했습니다', '💡', 'avg_score', '{"type": "problemSolving", "score": 90}'),
  ('professional', '전문가', '전문성 점수 평균 90점 이상을 달성했습니다', '🎓', 'avg_score', '{"type": "professionalism", "score": 90}')
ON CONFLICT (id) DO NOTHING;

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

