export interface Scenario {
  id: string
  title: string
  description: string
  customerScript: string
  context: string
  emotion?: 'angry' | 'normal' | 'sad' | 'frustrated' // 고객 감정 설정
  customerPrompt?: string // AI 고객 역할 프롬프트 (대화형)
}

export interface Session {
  id: string
  user_id: string // 사용자 ID 추가
  scenario_id: string
  created_at: string
}

export interface Response {
  id: string
  session_id: string
  audio_url?: string
  transcribed_text?: string
  created_at: string
}

export interface Feedback {
  id: string
  response_id: string
  feedback_json: {
    empathy: number
    problemSolving: number
    professionalism: number
    tone: number
    overallScore: number
    strengths: string[]
    improvements: string[]
    detailedFeedback: string
  }
  created_at: string
}

export type AppStep = 
  | 'mode-selection' // 모드 선택 (초기 화면)
  | 'admin-dashboard' // 관리자 대시보드
  | 'scenario-selection'
  | 'listening'
  | 'waiting-for-response'
  | 'recording'
  | 'transcribing'
  | 'generating-response'
  | 'analyzing'
  | 'feedback'
  | 'profile'
  | 'leaderboard'
  | 'quiz-home' // 퀴즈 업로드
  | 'quiz-solver' // 퀴즈 풀이
  | 'quiz-result' // 퀴즈 결과

export interface ConversationTurn {
  role: 'customer' | 'user'
  text: string
  timestamp: Date
}
