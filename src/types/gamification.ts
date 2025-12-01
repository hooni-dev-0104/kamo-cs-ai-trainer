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
}

export type LeaderboardPeriod = 'all' | 'weekly' | 'monthly'

export interface BadgeCondition {
  type: string
  value: Record<string, any>
}

