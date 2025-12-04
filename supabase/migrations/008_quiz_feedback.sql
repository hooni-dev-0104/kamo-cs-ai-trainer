-- 퀴즈 피드백 관리 기능을 위한 스키마

-- 1. 퀴즈 피드백 테이블 생성
CREATE TABLE IF NOT EXISTS quiz_feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_result_id UUID NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES quiz_materials(id) ON DELETE CASCADE,
  
  -- 피드백 내용
  feedback_text TEXT NOT NULL, -- 관리자가 작성한 피드백
  ai_recommended_feedback TEXT, -- AI가 추천한 피드백 (참고용)
  weak_areas JSONB, -- 취약 영역 분석 결과 (예: {"areas": ["문제 해결", "전문성"], "details": {...}})
  
  -- 상태 관리
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'read'
  email_sent_at TIMESTAMP WITH TIME ZONE, -- 이메일 발송 시간
  read_at TIMESTAMP WITH TIME ZONE, -- 사용자가 읽은 시간
  
  -- 메타데이터
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 피드백 작성자 (관리자)
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

-- RLS 정책: 사용자는 자신의 피드백만 볼 수 있음
CREATE POLICY "Users can view own quiz feedbacks" ON quiz_feedbacks
  FOR SELECT USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 피드백을 읽음 처리할 수 있음
CREATE POLICY "Users can update own quiz feedbacks" ON quiz_feedbacks
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 관리자는 모든 피드백을 볼 수 있음
CREATE POLICY "Admins can view all quiz feedbacks" ON quiz_feedbacks
  FOR SELECT USING (public.is_admin());

-- RLS 정책: 관리자는 피드백을 생성, 수정, 삭제할 수 있음
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

CREATE TRIGGER update_quiz_feedbacks_updated_at
  BEFORE UPDATE ON quiz_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_feedbacks_updated_at();

