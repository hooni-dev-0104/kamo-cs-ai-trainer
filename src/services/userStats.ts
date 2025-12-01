import { supabase } from './supabase'
import { UserStats } from '../types/gamification'

/**
 * 사용자 통계 가져오기 또는 생성
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  // 기존 통계 확인
  const { data: existing } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existing) {
    return existing as UserStats
  }

  // 없으면 생성
  const { data: newStats, error: createError } = await supabase
    .from('user_stats')
    .insert({
      user_id: userId,
      total_score: 0,
      completed_sessions: 0,
      level: 1,
    })
    .select()
    .single()

  if (createError) {
    throw new Error(`Failed to create user stats: ${createError.message}`)
  }

  return newStats as UserStats
}

/**
 * 점수 추가 및 통계 업데이트
 */
export async function addScore(
  userId: string,
  score: number,
  sessionId?: string // 선택적 파라미터로 변경
): Promise<UserStats> {
  // 기존 통계 가져오기
  const stats = await getUserStats(userId)

  // 새 점수 계산
  const newTotalScore = stats.total_score + score
  const newCompletedSessions = stats.completed_sessions + 1

  // 레벨 계산 (100점당 1레벨)
  const newLevel = Math.floor(newTotalScore / 100) + 1

  // 통계 업데이트
  const { data, error } = await supabase
    .from('user_stats')
    .update({
      total_score: newTotalScore,
      completed_sessions: newCompletedSessions,
      level: newLevel,
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update user stats: ${error.message}`)
  }

  // sessionId가 있고 아직 user_id가 연결되지 않았을 수 있는 경우를 위해 (혹시 모를 안전장치)
  if (sessionId) {
    await supabase
      .from('sessions')
      .update({ user_id: userId })
      .eq('id', sessionId)
      .is('user_id', null) // 이미 연결된 경우 건너뜀
  }

  return data as UserStats
}

/**
 * 사용자 통계 가져오기 (현재 사용자)
 */
export async function getCurrentUserStats(): Promise<UserStats | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return getUserStats(user.id)
}

/**
 * 여러 사용자의 통계 가져오기 (리더보드용)
 */
export async function getMultipleUserStats(userIds: string[]): Promise<UserStats[]> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .in('user_id', userIds)

  if (error) {
    throw new Error(`Failed to get user stats: ${error.message}`)
  }

  return (data || []) as UserStats[]
}

