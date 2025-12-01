-- 1. 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user', -- 'admin' 또는 'user'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS(Row Level Security) 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. 관리자 확인 함수 (보안 정의자로 생성하여 RLS 우회 가능하게 함)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 정책 설정

-- 본인 프로필은 볼 수 있음
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 관리자는 모든 프로필을 볼 수 있음
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- 관리자만 프로필을 수정할 수 있음 (권한 변경 등)
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- 5. 새 유저 가입 시 자동으로 프로필 생성하는 트리거 (수정됨)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- 이메일에 'admin'이 포함되어 있거나, 특정 이메일인 경우 관리자로 설정
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

-- 트리거 연결 (이미 존재하면 삭제 후 생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. 기존 데이터 마이그레이션 (이미 가입된 유저들을 위해)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 
  CASE 
    WHEN email ILIKE '%admin%' THEN 'admin' 
    ELSE 'user' 
  END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 7. 기존 유저 중 'admin'이 포함된 이메일은 관리자로 업데이트
UPDATE public.profiles
SET role = 'admin'
WHERE email ILIKE '%admin%';
