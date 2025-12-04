-- AI 출제 프롬프트 기능 추가

-- quiz_materials 테이블에 ai_prompt 컬럼 추가
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

-- 컬럼 코멘트 추가
COMMENT ON COLUMN quiz_materials.ai_prompt IS 'AI 문제 출제 시 참고할 커스텀 프롬프트 (선택사항)';

