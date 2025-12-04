-- 소속(department) 및 시험 제한시간 기능 추가

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

-- quiz_materials 테이블에 time_limit 컬럼 추가 (분 단위, NULL이면 제한시간 없음)
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

-- department 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN profiles.department IS '소속: kmcc_yongsan(KMCC 용산), kmcc_gwangju(KMCC 광주), km_crew(KM 크루)';
COMMENT ON COLUMN quiz_materials.time_limit IS '시험 제한시간 (분 단위, NULL이면 제한시간 없음)';

-- department 인덱스 생성 (통계 및 필터링 용도)
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);

