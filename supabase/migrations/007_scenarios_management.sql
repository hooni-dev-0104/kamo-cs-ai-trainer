-- 시나리오 관리 기능을 위한 스키마

-- 시나리오 테이블 생성 (이미 있으면 스킵)
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  customer_script TEXT NOT NULL,
  customer_prompt TEXT,
  context TEXT NOT NULL,
  emotion TEXT DEFAULT 'frustrated' -- 'angry', 'normal', 'sad', 'frustrated'
);

-- 기존 테이블에 컬럼 추가 (없는 경우만)
DO $$ 
BEGIN
  -- customer_prompt 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'customer_prompt'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN customer_prompt TEXT;
  END IF;

  -- emotion 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'emotion'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN emotion TEXT DEFAULT 'frustrated';
  END IF;

  -- created_by 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- created_at 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- updated_at 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scenarios' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 인덱스 생성 (조건부)
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at DESC);

DO $$ 
BEGIN
  -- created_by 컬럼이 존재할 때만 인덱스 생성
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

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Everyone can view scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admins can insert scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admins can update scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admins can delete scenarios" ON scenarios;
DROP POLICY IF EXISTS "Allow all operations on scenarios" ON scenarios;

-- 정책: 모든 사용자는 시나리오를 읽을 수 있음 (시뮬레이션 사용을 위해)
CREATE POLICY "Everyone can view scenarios" ON scenarios
  FOR SELECT USING (true);

-- 정책: 관리자만 시나리오를 생성, 수정, 삭제할 수 있음
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

CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_scenarios_updated_at();

-- 기존 하드코딩된 시나리오 데이터 삽입 (이미 있으면 스킵)
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

