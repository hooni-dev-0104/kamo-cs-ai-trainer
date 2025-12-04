export interface UserStats {
  id: string
  user_id: string
  total_score: number
  completed_sessions: number
  level: number
  created_at: string
  updated_at: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  condition_type: string
  condition_value: Record<string, any>
  created_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  session_id?: string
}

export interface LeaderboardEntry {
  user_id: string
  total_score: number
  completed_sessions: number
  level: number
  rank: number
  user_email?: string
  user_name?: string
  is_retraining_candidate?: boolean // 재교육 대상 여부
  percentile?: number // 상위 몇 % (0-100)
}

export type LeaderboardPeriod = 'all' | 'weekly' | 'monthly'

// 리더보드 통계 정보
export interface LeaderboardStatistics {
  total_users: number
  average_score: number
  median_score: number
  top_score: number
  cutoff_score: number // 재교육 기준 점수 (평균 또는 커트라인)
  current_user_percentile?: number // 현재 사용자 상위 %
}

// 문항별 통계
export interface QuestionStatistics {
  question_id: number
  question_text: string
  total_attempts: number
  correct_count: number
  incorrect_count: number
  correct_rate: number // 정답률 (0-100)
  incorrect_rate: number // 오답률 (0-100)
  material_id?: string
  material_title?: string
}

export interface BadgeCondition {
  type: string
  value: Record<string, any>
}

