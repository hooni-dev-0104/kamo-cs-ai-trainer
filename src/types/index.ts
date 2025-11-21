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
  | 'scenario-selection'
  | 'listening'
  | 'recording'
  | 'transcribing'
  | 'generating-response'
  | 'analyzing'
  | 'feedback'

export interface ConversationTurn {
  role: 'customer' | 'user'
  text: string
  timestamp: Date
}

