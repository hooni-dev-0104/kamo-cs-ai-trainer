-- 퀴즈 피드백 상세 분석 기능 추가

-- quiz_feedbacks 테이블에 새로운 컬럼 추가
DO $$ 
BEGIN
  -- 틀린 문제 상세 분석 (JSON 배열)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_feedbacks' 
    AND column_name = 'wrong_question_analysis'
  ) THEN
    ALTER TABLE quiz_feedbacks ADD COLUMN wrong_question_analysis JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- 전체적인 학습 권장사항
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_feedbacks' 
    AND column_name = 'overall_recommendation'
  ) THEN
    ALTER TABLE quiz_feedbacks ADD COLUMN overall_recommendation TEXT;
  END IF;
END $$;

-- 코멘트 추가
COMMENT ON COLUMN quiz_feedbacks.wrong_question_analysis IS '틀린 문제별 상세 분석 (JSON 배열: questionId, whyWrong, keyConceptExplanation, learningTip)';
COMMENT ON COLUMN quiz_feedbacks.overall_recommendation IS '전체적인 학습 권장사항 및 다음 단계';

