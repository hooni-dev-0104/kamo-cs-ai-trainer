export type QuizType = 'multiple-choice' | 'true-false'
export type QuizDifficulty = 'easy' | 'medium' | 'hard'

export interface QuizQuestion {
  id: number
  type: QuizType
  question: string
  options?: string[] // 객관식 보기 (O/X는 없음)
  correctAnswer: string | boolean // 정답 (객관식은 문자열, O/X는 불리언)
  explanation: string // 해설
}

export interface QuizSet {
  title: string
  description: string
  questions: QuizQuestion[]
  materialId?: string // 학습 자료 ID (DB 저장용)
  difficulty?: QuizDifficulty // 난이도
}

export interface QuizResult {
  totalQuestions: number
  correctCount: number
  score: number
  wrongQuestions: number[] // 틀린 문제 ID 목록
  userAnswers: Record<number, string | boolean> // 사용자 답안
}

export interface QuizMaterial {
  id: string
  title: string
  description?: string
  content: string
  created_by: string
  created_at: string
  retraining_threshold?: number // 재교육 기준 점수 (기본값 70)
  time_limit?: number // 시험 제한시간 (분 단위, null이면 제한 없음)
  total_questions?: number // 총 문항 수 (기본값 10)
  multiple_choice_count?: number // 객관식 문항 수 (기본값 5)
  true_false_count?: number // OX 문항 수 (기본값 5)
  required_topics?: string[] // 필수 포함 영역/키워드
  quiz_mode?: 'ai' | 'manual' | 'both' // 출제 모드
}

// DB에 저장되는 퀴즈 세션 정보
export interface QuizSession {
  id: string
  material_id: string
  user_id: string
  difficulty: QuizDifficulty
  created_at: string
}

// DB에 저장되는 퀴즈 결과 정보
export interface QuizResultRecord {
  id: string
  session_id: string
  total_questions: number
  correct_count: number
  score: number
  wrong_questions: number[]
  user_answers: Record<number, string | boolean>
  created_at: string
}

// 관리자 대시보드 통계용
export interface QuizStatistics {
  material_id: string
  material_title: string
  total_sessions: number
  total_users: number
  average_score: number
  retraining_count: number // 재교육 대상 수
  retraining_threshold: number
}

// 월별 통계
export interface MonthlyStatistics {
  year: number
  month: number
  month_label: string // "2024년 1월" 형식
  total_attempts: number // 총 응시 횟수
  total_users: number // 총 응시자 수
  average_score: number // 전체 평균 점수
  retraining_attempts: number // 재교육 대상 응시 횟수
  retraining_users: number // 재교육 대상자 수
  retraining_average_score: number // 재교육 대상자들의 평균 점수
  pass_rate: number // 합격률 (재교육 기준 이상)
}

// 재교육 대상 사용자 정보
export interface RetrainingCandidate {
  user_id: string
  user_email: string
  material_id: string
  material_title: string
  latest_score: number
  latest_session_date: string
  attempt_count: number // 시도 횟수
}

// 개별 응시 기록 (평가 현황 상세)
export interface QuizAttemptRecord {
  user_id: string
  user_email: string
  material_id: string
  material_title: string
  session_id: string
  score: number
  total_questions: number
  correct_count: number
  difficulty: QuizDifficulty
  created_at: string
}

// 틀린 문제 상세 분석
export interface WrongQuestionAnalysis {
  questionId: number
  questionText: string
  userAnswer: string
  correctAnswer: string
  whyWrong: string // 왜 틀렸는지 구체적 분석
  keyConceptExplanation: string // 핵심 개념 설명
  learningTip: string // 학습 팁
}

// 취약 영역 분석 결과
export interface WeakArea {
  area: string // 예: "문제 해결", "전문성", "고객 이해"
  description: string
  improvementPlan?: string // 개선 방법 및 학습 계획
  questions: number[] // 관련 문제 ID 목록
  priority?: 'high' | 'medium' | 'low' // 우선순위
}

// 퀴즈 피드백
export interface QuizFeedback {
  id: string
  quiz_result_id: string
  user_id: string
  material_id: string
  feedback_text: string // 관리자가 작성한 피드백
  ai_recommended_feedback?: string // AI 추천 피드백 요약
  wrong_question_analysis?: WrongQuestionAnalysis[] // 틀린 문제 상세 분석
  weak_areas?: {
    areas: string[]
    details: WeakArea[]
  }
  overall_recommendation?: string // 전체적인 학습 권장사항
  status: 'pending' | 'sent' | 'read'
  email_sent_at?: string
  read_at?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// 관리자가 직접 작성한 문제
export interface ManualQuizQuestion {
  id: string
  material_id: string
  question_type: 'multiple-choice' | 'true-false'
  question: string
  options?: string[] // 객관식 보기
  correct_answer: string // 객관식: 정답 문자열, OX: 'true' 또는 'false'
  explanation: string
  order_index: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

