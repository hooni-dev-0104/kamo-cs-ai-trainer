-- 퀴즈 관리 기능을 위한 스키마 확장

-- 1. quiz_materials 테이블에 재교육 기준 점수 필드 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'retraining_threshold'
  ) THEN
    ALTER TABLE quiz_materials 
      ADD COLUMN retraining_threshold INTEGER DEFAULT 70; -- 기본값 70점
  END IF;
END $$;

-- 2. 퀴즈 세션 테이블 생성 (시험 응시 기록)
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES quiz_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 퀴즈 결과 테이블 생성 (시험 결과 저장)
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score INTEGER NOT NULL, -- 0-100
  wrong_questions INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- 틀린 문제 ID 배열
  user_answers JSONB NOT NULL, -- 사용자 답안 기록
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_material_id ON quiz_sessions(material_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created_at ON quiz_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_session_id ON quiz_results(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_score ON quiz_results(score);

-- RLS 활성화
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 세션과 결과만 볼 수 있음
CREATE POLICY "Users can view own quiz sessions" ON quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own quiz results" ON quiz_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions 
      WHERE quiz_sessions.id = quiz_results.session_id 
      AND quiz_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own quiz results" ON quiz_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_sessions 
      WHERE quiz_sessions.id = quiz_results.session_id 
      AND quiz_sessions.user_id = auth.uid()
    )
  );

-- 관리자는 모든 세션과 결과를 볼 수 있음 (통계용)
CREATE POLICY "Admins can view all quiz sessions" ON quiz_sessions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all quiz results" ON quiz_results
  FOR SELECT USING (public.is_admin());

-- 관리자는 재교육 기준을 수정할 수 있음
CREATE POLICY "Admins can update quiz materials" ON quiz_materials
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

