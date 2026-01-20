-- ============================================================
-- KAMO CS Trainer - Supabase 전체 복구 SQL
-- ============================================================
-- 이 파일은 삭제된 Supabase 프로젝트를 복구하기 위한 통합 SQL입니다.
-- Supabase Dashboard > SQL Editor에서 이 파일을 실행하세요.
-- 
-- 포함 내용:
--   - 13개 테이블
--   - RLS (Row Level Security) 정책
--   - 함수 및 트리거
--   - 초기 데이터 (배지 8개, 시나리오 5개)
-- ============================================================

-- ============================================================
-- PART 1: 기본 테이블 (001_initial_schema.sql)
-- ============================================================

-- uuid 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 세션 테이블
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 응대 기록 테이블
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  audio_url TEXT,
  transcribed_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 피드백 테이블
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  feedback_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses(session_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_response_id ON feedbacks(response_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Row Level Security 활성화
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽고 쓸 수 있도록 정책 설정 (프로토타입용)
CREATE POLICY "Allow all operations on sessions" ON sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on responses" ON responses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on feedbacks" ON feedbacks
  FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- PART 2: 게임화 기능 (002_gamification.sql)
-- ============================================================

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

-- sessions 테이블에 user_id 추가
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

-- sessions 테이블의 user_id 인덱스 생성
DO $$ 
DECLARE
  column_exists BOOLEAN;
  index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'sessions' 
    AND column_name = 'user_id'
  ) INTO column_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND indexname = 'idx_sessions_user_id'
  ) INTO index_exists;
  
  IF column_exists AND NOT index_exists THEN
    EXECUTE 'CREATE INDEX idx_sessions_user_id ON public.sessions(user_id)';
  END IF;
END $$;

-- Row Level Security 활성화
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view badges" ON badges
  FOR SELECT USING (true);

CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- PART 3: 퀴즈 학습 자료 (003_quiz_materials.sql)
-- ============================================================

-- 퀴즈 학습 자료 테이블
CREATE TABLE IF NOT EXISTS quiz_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_quiz_materials_created_at ON quiz_materials(created_at DESC);

-- RLS 활성화
ALTER TABLE quiz_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view quiz materials" ON quiz_materials
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert quiz materials" ON quiz_materials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete quiz materials" ON quiz_materials
  FOR DELETE USING (auth.role() = 'authenticated');


-- ============================================================
-- PART 4: 사용자 관리 (004_user_management.sql)
-- ============================================================

-- 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 관리자 확인 함수
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 정책 설정
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 새 유저 가입 시 자동으로 프로필 생성하는 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  IF new.email ILIKE '%admin%' OR new.email IN ('admin@test.com', 'admin@example.com') THEN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'admin');
  ELSE
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'user');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 연결
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 기존 데이터 마이그레이션
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 
  CASE 
    WHEN email ILIKE '%admin%' THEN 'admin' 
    ELSE 'user' 
  END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 기존 유저 중 'admin'이 포함된 이메일은 관리자로 업데이트
UPDATE public.profiles
SET role = 'admin'
WHERE email ILIKE '%admin%';


-- ============================================================
-- PART 5: RLS 정책 수정 (005_fix_rls.sql)
-- ============================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;

-- 관리자는 모든 프로필 조회 가능
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- 관리자만 프로필 수정 가능
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());


-- ============================================================
-- PART 6: 퀴즈 관리 (006_quiz_management.sql)
-- ============================================================

-- quiz_materials 테이블에 재교육 기준 점수 필드 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'retraining_threshold'
  ) THEN
    ALTER TABLE quiz_materials 
      ADD COLUMN retraining_threshold INTEGER DEFAULT 70;
  END IF;
END $$;

-- 퀴즈 세션 테이블 생성
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES quiz_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 퀴즈 결과 테이블 생성
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score INTEGER NOT NULL,
  wrong_questions INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  user_answers JSONB NOT NULL,
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

-- RLS 정책
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

-- 관리자는 모든 세션과 결과를 볼 수 있음
CREATE POLICY "Admins can view all quiz sessions" ON quiz_sessions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all quiz results" ON quiz_results
  FOR SELECT USING (public.is_admin());

-- 관리자는 재교육 기준을 수정할 수 있음
CREATE POLICY "Admins can update quiz materials" ON quiz_materials
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- PART 7: 시나리오 관리 (007_scenarios_management.sql)
-- ============================================================

-- 시나리오 테이블 생성
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  customer_script TEXT NOT NULL,
  customer_prompt TEXT,
  context TEXT NOT NULL,
  emotion TEXT DEFAULT 'frustrated'
);

-- 기존 테이블에 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'customer_prompt'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN customer_prompt TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'emotion'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN emotion TEXT DEFAULT 'frustrated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at DESC);

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'created_by'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON scenarios(created_by);
  END IF;
END $$;

-- RLS 활성화
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Everyone can view scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admins can insert scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admins can update scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admins can delete scenarios" ON scenarios;
DROP POLICY IF EXISTS "Allow all operations on scenarios" ON scenarios;

-- 정책
CREATE POLICY "Everyone can view scenarios" ON scenarios
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert scenarios" ON scenarios
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update scenarios" ON scenarios
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete scenarios" ON scenarios
  FOR DELETE TO authenticated USING (public.is_admin());

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_scenarios_updated_at ON scenarios;
CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_scenarios_updated_at();

-- 초기 시나리오 데이터 삽입
INSERT INTO scenarios (id, title, description, customer_script, customer_prompt, context, emotion) VALUES
  ('taxi-wrong-route', '택시 경로 이탈 불만', '기사가 앱에 표시된 경로대로 운행하지 않은 경우',
   '안녕하세요, 방금 택시를 이용했는데요. 앱에서 보여준 경로와 완전히 다르게 갔어요. 왜 그런 거예요? 요금도 더 많이 나온 것 같은데요.',
   '당신은 택시 앱을 이용했는데, 앱에서 보여준 경로와 다르게 운행되어 답답하고 불만스러운 고객입니다. 상담원의 응대에 따라 감정이 변화할 수 있습니다. 상담원이 잘 대응하면 감정이 누그러지고, 그렇지 않으면 더 화가 날 수 있습니다. 자연스럽고 짧게 대화하세요.',
   '고객이 택시 앱에서 표시된 경로와 다르게 운행된 것에 대해 불만을 제기하는 상황입니다. 상담원은 고객의 불만을 공감하고, 경로 이탈 사유를 확인하며, 요금 차이에 대한 보상 방안을 제시해야 합니다.',
   'frustrated'),
  
  ('taxi-wrong-destination', '택시 잘못된 도착지 하차 불만', '도착지가 아닌 곳에 내려준 경우',
   '정말 화가 나네요. 제가 명확하게 도착지를 말씀드렸는데, 완전히 다른 곳에 내려주셨어요. 이제 어떻게 하라는 거예요?',
   '당신은 택시 기사가 명확하게 말한 도착지가 아닌 다른 곳에 내려주어 매우 화가 난 고객입니다. 상담원의 응대에 따라 감정이 변화할 수 있습니다. 상담원이 공감하고 해결책을 제시하면 감정이 누그러지고, 그렇지 않으면 더 화가 날 수 있습니다. 자연스럽고 짧게 대화하세요.',
   '고객이 요청한 도착지와 다른 곳에 하차당한 것에 대해 매우 화가 난 상황입니다. 상담원은 고객의 감정을 공감하고, 즉시 해결 방안을 제시하며(재호출, 보상 등), 고객의 신뢰를 회복하기 위해 적극적으로 대응해야 합니다.',
   'angry'),
  
  ('designated-driver-late', '대리기사 지각 불만', '대리기사가 약속 시간에 도착하지 않은 경우',
   '대리기사가 30분 전에 도착한다고 했는데, 지금까지 안 와요. 제가 중요한 약속이 있는데 이렇게 되면 어떻게 하죠?',
   '당신은 대리기사가 약속 시간에 도착하지 않아 중요한 약속에 차질이 생길까봐 매우 답답하고 불안한 고객입니다. 상담원의 응대에 따라 감정이 변화할 수 있습니다. 상담원이 빠른 해결책을 제시하면 안심하고, 그렇지 않으면 더 불안해질 수 있습니다. 자연스럽고 짧게 대화하세요.',
   '고객이 대리기사의 지각으로 인해 일정에 차질이 생긴 상황입니다. 상담원은 고객의 답답함을 공감하고, 현재 대리기사의 위치를 확인하며, 대안(다른 대리기사 배정, 보상 등)을 제시해야 합니다.',
   'frustrated'),
  
  ('designated-driver-unsafe', '대리기사 안전운전 미준수 불만', '대리기사가 안전하게 운전하지 않았다는 불만',
   '대리기사분이 너무 위험하게 운전하셨어요. 과속도 하고, 급정거도 여러 번 하시고... 정말 무서웠어요. 이런 기사분이 계속 운행해도 되나요?',
   '당신은 대리기사가 위험하게 운전하여 무서움을 느낀 고객입니다. 안전에 대한 우려가 크고, 이런 기사가 계속 운행하는 것에 대해 불안합니다. 상담원의 응대에 따라 감정이 변화할 수 있습니다. 상담원이 진지하게 받아들이고 조치를 약속하면 안심하고, 그렇지 않으면 더 불안해질 수 있습니다. 자연스럽고 짧게 대화하세요.',
   '고객이 대리기사의 안전운전 미준수로 인해 불안감을 느낀 상황입니다. 상담원은 고객의 안전에 대한 우려를 진지하게 받아들이고, 해당 기사에 대한 조치를 취하겠다고 약속하며, 고객에게 사과와 보상 방안을 제시해야 합니다.',
   'frustrated'),
  
  ('designated-driver-fare-error', '대리 요금 청구 오류 불만', '대리 요금이 잘못 청구된 경우',
   '대리 이용했는데, 앱에 표시된 예상 요금보다 훨씬 많이 청구됐어요. 거리도 비슷한데 왜 이렇게 차이가 나는 거예요? 환불 받을 수 있나요?',
   '당신은 대리 요금이 예상보다 많이 청구되어 불만스러운 고객입니다. 요금 차이에 대한 설명을 원하고, 오류가 있다면 환불을 원합니다. 상담원의 응대에 따라 감정이 변화할 수 있습니다. 상담원이 명확히 설명하고 해결책을 제시하면 이해하고, 그렇지 않으면 더 불만스러워질 수 있습니다. 자연스럽고 짧게 대화하세요.',
   '고객이 대리 요금이 예상과 다르게 청구된 것에 대해 불만을 제기하는 상황입니다. 상담원은 요금 산정 기준을 명확히 설명하고, 실제 이동 경로와 거리를 확인하여 정당한 요금인지 검토하며, 오류가 있다면 즉시 환불 처리해야 합니다.',
   'frustrated')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PART 8: 퀴즈 피드백 (008_quiz_feedback.sql)
-- ============================================================

-- 퀴즈 피드백 테이블 생성
CREATE TABLE IF NOT EXISTS quiz_feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_result_id UUID NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES quiz_materials(id) ON DELETE CASCADE,
  
  feedback_text TEXT NOT NULL,
  ai_recommended_feedback TEXT,
  weak_areas JSONB,
  
  status TEXT DEFAULT 'pending',
  email_sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_quiz_feedbacks_quiz_result_id ON quiz_feedbacks(quiz_result_id);
CREATE INDEX IF NOT EXISTS idx_quiz_feedbacks_user_id ON quiz_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_feedbacks_material_id ON quiz_feedbacks(material_id);
CREATE INDEX IF NOT EXISTS idx_quiz_feedbacks_status ON quiz_feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_quiz_feedbacks_created_at ON quiz_feedbacks(created_at DESC);

-- RLS 활성화
ALTER TABLE quiz_feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view own quiz feedbacks" ON quiz_feedbacks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz feedbacks" ON quiz_feedbacks
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all quiz feedbacks" ON quiz_feedbacks
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage quiz feedbacks" ON quiz_feedbacks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_quiz_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quiz_feedbacks_updated_at ON quiz_feedbacks;
CREATE TRIGGER update_quiz_feedbacks_updated_at
  BEFORE UPDATE ON quiz_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_feedbacks_updated_at();


-- ============================================================
-- PART 9: 소속 및 시험 제한시간 (009_department_and_time_limit.sql)
-- ============================================================

-- 소속 enum 타입 생성
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_type') THEN
    CREATE TYPE department_type AS ENUM ('kmcc_yongsan', 'kmcc_gwangju', 'km_crew');
  END IF;
END $$;

-- profiles 테이블에 department 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'department'
  ) THEN
    ALTER TABLE profiles ADD COLUMN department department_type;
  END IF;
END $$;

-- quiz_materials 테이블에 time_limit 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'time_limit'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN time_limit INTEGER DEFAULT NULL;
  END IF;
END $$;

-- 코멘트 추가
COMMENT ON COLUMN profiles.department IS '소속: kmcc_yongsan(KMCC 용산), kmcc_gwangju(KMCC 광주), km_crew(KM 크루)';
COMMENT ON COLUMN quiz_materials.time_limit IS '시험 제한시간 (분 단위, NULL이면 제한시간 없음)';

-- department 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);


-- ============================================================
-- PART 10: 시험 설정 및 직접 출제 (010_quiz_settings_and_manual_questions.sql)
-- ============================================================

-- quiz_materials 테이블에 AI 출제 설정 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN total_questions INTEGER DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'multiple_choice_count'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN multiple_choice_count INTEGER DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'true_false_count'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN true_false_count INTEGER DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'required_topics'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN required_topics JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'quiz_mode'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN quiz_mode TEXT DEFAULT 'ai' CHECK (quiz_mode IN ('ai', 'manual', 'both'));
  END IF;
END $$;

-- 관리자가 직접 작성한 문제 테이블 생성
CREATE TABLE IF NOT EXISTS manual_quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES quiz_materials(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'true-false')),
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_manual_questions_material_id ON manual_quiz_questions(material_id);
CREATE INDEX IF NOT EXISTS idx_manual_questions_active ON manual_quiz_questions(material_id, is_active);
CREATE INDEX IF NOT EXISTS idx_manual_questions_order ON manual_quiz_questions(material_id, order_index);

-- RLS 활성화
ALTER TABLE manual_quiz_questions ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_manual_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_manual_questions_updated_at ON manual_quiz_questions;
CREATE TRIGGER update_manual_questions_updated_at
  BEFORE UPDATE ON manual_quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_questions_updated_at();

-- 코멘트 추가
COMMENT ON COLUMN quiz_materials.total_questions IS '총 출제 문항 수 (기본값: 10)';
COMMENT ON COLUMN quiz_materials.multiple_choice_count IS '객관식 문항 수 (기본값: 5)';
COMMENT ON COLUMN quiz_materials.true_false_count IS 'OX 문항 수 (기본값: 5)';
COMMENT ON COLUMN quiz_materials.required_topics IS '필수 포함 영역/키워드 (JSON 배열)';
COMMENT ON COLUMN quiz_materials.quiz_mode IS '출제 모드: ai(AI 자동), manual(직접 출제), both(혼합)';
COMMENT ON TABLE manual_quiz_questions IS '관리자가 직접 작성한 시험 문제';


-- ============================================================
-- PART 11: 퀴즈 피드백 상세 분석 (011_detailed_quiz_feedback.sql)
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_feedbacks' 
    AND column_name = 'wrong_question_analysis'
  ) THEN
    ALTER TABLE quiz_feedbacks ADD COLUMN wrong_question_analysis JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_feedbacks' 
    AND column_name = 'overall_recommendation'
  ) THEN
    ALTER TABLE quiz_feedbacks ADD COLUMN overall_recommendation TEXT;
  END IF;
END $$;

COMMENT ON COLUMN quiz_feedbacks.wrong_question_analysis IS '틀린 문제별 상세 분석 (JSON 배열: questionId, whyWrong, keyConceptExplanation, learningTip)';
COMMENT ON COLUMN quiz_feedbacks.overall_recommendation IS '전체적인 학습 권장사항 및 다음 단계';


-- ============================================================
-- PART 12: manual_quiz_questions RLS 정책 수정 (013_fix_manual_questions_rls.sql)
-- ============================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Everyone can view active manual questions" ON manual_quiz_questions;
DROP POLICY IF EXISTS "Admins can insert manual questions" ON manual_quiz_questions;
DROP POLICY IF EXISTS "Admins can update manual questions" ON manual_quiz_questions;
DROP POLICY IF EXISTS "Admins can delete manual questions" ON manual_quiz_questions;
DROP POLICY IF EXISTS "Admins can view all manual questions" ON manual_quiz_questions;

-- 정책 재생성
CREATE POLICY "Everyone can view active manual questions" ON manual_quiz_questions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all manual questions" ON manual_quiz_questions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert manual questions" ON manual_quiz_questions
  FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update manual questions" ON manual_quiz_questions
  FOR UPDATE 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete manual questions" ON manual_quiz_questions
  FOR DELETE 
  USING (public.is_admin());


-- ============================================================
-- PART 13: AI 출제 프롬프트 (014_add_quiz_prompt.sql)
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'ai_prompt'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN ai_prompt TEXT DEFAULT NULL;
  END IF;
END $$;

COMMENT ON COLUMN quiz_materials.ai_prompt IS 'AI 문제 출제 시 참고할 커스텀 프롬프트 (선택사항)';


-- ============================================================
-- 복구 완료!
-- ============================================================
-- 모든 테이블, 함수, 트리거, RLS 정책, 초기 데이터가 복구되었습니다.
-- 
-- 다음 단계:
-- 1. Supabase Dashboard > Authentication에서 이메일 인증 활성화
-- 2. 프로젝트의 .env 파일에서 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY 업데이트
-- 3. Vercel 등 배포 환경의 환경변수도 업데이트
-- ============================================================
