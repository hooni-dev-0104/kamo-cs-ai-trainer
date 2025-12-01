-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;

-- 1. 조회 정책:
-- 본인은 본인 프로필 조회 가능 (기존 정책 유지 또는 재확인)
-- 관리자는 모든 프로필 조회 가능
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- 2. 수정 정책:
-- 관리자만 프로필(권한 등)을 수정할 수 있음
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- 참고: "Users can view own profile" 정책은 004번 파일에서 이미 생성됨
