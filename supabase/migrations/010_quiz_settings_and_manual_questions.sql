-- 시험 설정 및 직접 출제 기능 추가

-- quiz_materials 테이블에 AI 출제 설정 컬럼 추가
DO $$ 
BEGIN
  -- 문항 수 설정 (기본값 10)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN total_questions INTEGER DEFAULT 10;
  END IF;

  -- 객관식 문항 수 (기본값 5)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'multiple_choice_count'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN multiple_choice_count INTEGER DEFAULT 5;
  END IF;

  -- OX 문항 수 (기본값 5)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'true_false_count'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN true_false_count INTEGER DEFAULT 5;
  END IF;

  -- 필수 포함 키워드/영역 (JSON 배열)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_materials' 
    AND column_name = 'required_topics'
  ) THEN
    ALTER TABLE quiz_materials ADD COLUMN required_topics JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- 출제 모드 (ai: AI 자동 출제, manual: 관리자 직접 출제, both: 혼합)
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
  options JSONB, -- 객관식 보기 (배열)
  correct_answer TEXT NOT NULL, -- 객관식: 정답 문자열, OX: 'true' 또는 'false'
  explanation TEXT NOT NULL,
  order_index INTEGER DEFAULT 0, -- 문제 순서
  is_active BOOLEAN DEFAULT true, -- 활성화 여부
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

-- 정책: 모든 사용자는 활성화된 문제를 읽을 수 있음
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'manual_quiz_questions' 
    AND policyname = 'Everyone can view active manual questions'
  ) THEN
    CREATE POLICY "Everyone can view active manual questions" ON manual_quiz_questions
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- 정책: 관리자만 문제를 생성, 수정, 삭제할 수 있음
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'manual_quiz_questions' 
    AND policyname = 'Admins can insert manual questions'
  ) THEN
    CREATE POLICY "Admins can insert manual questions" ON manual_quiz_questions
      FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'manual_quiz_questions' 
    AND policyname = 'Admins can update manual questions'
  ) THEN
    CREATE POLICY "Admins can update manual questions" ON manual_quiz_questions
      FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'manual_quiz_questions' 
    AND policyname = 'Admins can delete manual questions'
  ) THEN
    CREATE POLICY "Admins can delete manual questions" ON manual_quiz_questions
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

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

