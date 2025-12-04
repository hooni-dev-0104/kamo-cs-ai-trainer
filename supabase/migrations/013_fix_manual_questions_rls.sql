-- manual_quiz_questions RLS 정책 수정

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Everyone can view active manual questions" ON manual_quiz_questions;
DROP POLICY IF EXISTS "Admins can insert manual questions" ON manual_quiz_questions;
DROP POLICY IF EXISTS "Admins can update manual questions" ON manual_quiz_questions;
DROP POLICY IF EXISTS "Admins can delete manual questions" ON manual_quiz_questions;

-- 정책 재생성

-- 1. 모든 사용자는 활성화된 문제를 읽을 수 있음
CREATE POLICY "Everyone can view active manual questions" ON manual_quiz_questions
  FOR SELECT USING (is_active = true);

-- 2. 관리자는 모든 문제를 읽을 수 있음 (비활성화된 문제 포함)
CREATE POLICY "Admins can view all manual questions" ON manual_quiz_questions
  FOR SELECT USING (public.is_admin());

-- 3. 관리자만 문제를 생성할 수 있음
CREATE POLICY "Admins can insert manual questions" ON manual_quiz_questions
  FOR INSERT 
  WITH CHECK (public.is_admin());

-- 4. 관리자만 문제를 수정할 수 있음
CREATE POLICY "Admins can update manual questions" ON manual_quiz_questions
  FOR UPDATE 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. 관리자만 문제를 삭제할 수 있음
CREATE POLICY "Admins can delete manual questions" ON manual_quiz_questions
  FOR DELETE 
  USING (public.is_admin());

