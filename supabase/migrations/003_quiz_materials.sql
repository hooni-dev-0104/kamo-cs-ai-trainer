-- 퀴즈 학습 자료 테이블
CREATE TABLE IF NOT EXISTS quiz_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- 추출된 텍스트 원문
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_quiz_materials_created_at ON quiz_materials(created_at DESC);

-- RLS 활성화
ALTER TABLE quiz_materials ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 자료 목록과 내용은 볼 수 있음 (시험 응시를 위해)
CREATE POLICY "Everyone can view quiz materials" ON quiz_materials
  FOR SELECT USING (true);

-- 정책: 관리자만 자료를 추가/수정/삭제할 수 있음
-- (실제 관리자 체크는 앱 로직에서 user_metadata로 수행하고, 
--  DB 레벨에서는 일단 로그인한 사용자는 허용하되 앱에서 막는 방식으로 진행하거나,
--  Supabase의 커스텀 Claim을 써야 하는데 복잡하므로,
--  여기서는 일단 모든 인증된 사용자가 insert 가능하게 하되 앱에서 UI를 숨기는 방식으로 1차 구현.
--  보안을 강화하려면 trigger나 auth.jwt() -> role 체크가 필요함)

CREATE POLICY "Authenticated users can insert quiz materials" ON quiz_materials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete quiz materials" ON quiz_materials
  FOR DELETE USING (auth.role() = 'authenticated');

