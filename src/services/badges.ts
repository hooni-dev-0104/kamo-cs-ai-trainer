import { supabase } from './supabase'
import { Badge, UserBadge } from '../types/gamification'
import { Feedback } from '../types'

/**
 * 모든 배지 가져오기
 */
export async function getAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch badges: ${error.message}`)
  }

  return (data || []) as Badge[]
}

/**
 * 사용자가 획득한 배지 가져오기
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user badges: ${error.message}`)
  }

  return (data || []) as UserBadge[]
}

/**
 * 배지 획득
 */
export async function earnBadge(
  userId: string,
  badgeId: string,
  sessionId?: string
): Promise<UserBadge> {
  const { data, error } = await supabase
    .from('user_badges')
    .insert({
      user_id: userId,
      badge_id: badgeId,
      session_id: sessionId,
    })
    .select()
    .single()

  if (error) {
    // 이미 획득한 배지인 경우 무시
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .single()
      return existing as UserBadge
    }
    throw new Error(`Failed to earn badge: ${error.message}`)
  }

  return data as UserBadge
}

/**
 * 사용자가 특정 배지를 이미 획득했는지 확인
 */
export async function hasBadge(userId: string, badgeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .single()

  return !error && data !== null
}

/**
 * 배지 조건 체크 및 획득 처리
 */
export async function checkAndAwardBadges(
  userId: string,
  sessionId: string | undefined,
  feedback: Partial<Feedback['feedback_json']> | number, // 피드백 객체 또는 점수(number)
  userStats: { total_score: number; completed_sessions: number }
): Promise<string[]> {
  const earnedBadgeIds: string[] = []
  const allBadges = await getAllBadges()
  const userBadges = await getUserBadges(userId)
  const userBadgeIds = new Set(userBadges.map(b => b.badge_id))

  // 점수 추출 (feedback이 숫자인 경우 그 자체로 점수)
  const currentScore = typeof feedback === 'number' ? feedback : (feedback.overallScore || 0)

  for (const badge of allBadges) {
    // 이미 획득한 배지는 스킵
    if (userBadgeIds.has(badge.id)) {
      continue
    }

    let shouldAward = false

    switch (badge.condition_type) {
      case 'first_session':
        shouldAward = userStats.completed_sessions === 1
        break

      case 'perfect_score':
        const perfectScore = badge.condition_value.score || 100
        shouldAward = currentScore >= perfectScore
        break

      case 'session_count':
        const requiredCount = badge.condition_value.count || 10
        shouldAward = userStats.completed_sessions >= requiredCount
        break

      case 'all_scenarios':
        // 모든 시나리오 완료 체크 (나중에 구현 가능)
        // 현재는 스킵
        break

      case 'streak':
        // 연속 출석 체크 (나중에 구현 가능)
        // 현재는 스킵
        break

      case 'avg_score':
        // 피드백 객체가 아닌 경우 (퀴즈 등) 상세 점수 배지는 건너뜀
        if (typeof feedback === 'number') break;

        const scoreType = badge.condition_value.type
        const minScore = badge.condition_value.score || 90
        
        if (scoreType === 'empathy' && feedback.empathy !== undefined) {
          shouldAward = feedback.empathy >= minScore
        } else if (scoreType === 'problemSolving' && feedback.problemSolving !== undefined) {
          shouldAward = feedback.problemSolving >= minScore
        } else if (scoreType === 'professionalism' && feedback.professionalism !== undefined) {
          shouldAward = feedback.professionalism >= minScore
        }
        break
    }

    if (shouldAward) {
      try {
        await earnBadge(userId, badge.id, sessionId)
        earnedBadgeIds.push(badge.id)
      } catch (err) {
        console.error(`Failed to award badge ${badge.id}:`, err)
      }
    }
  }

  return earnedBadgeIds
}

