export type QuizType = 'multiple-choice' | 'true-false'

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
}

