import { supabase } from './supabase'
import { LeaderboardEntry, LeaderboardPeriod } from '../types/gamification'

/**
 * 리더보드 데이터 가져오기
 */
export async function getLeaderboard(
  period: LeaderboardPeriod = 'all',
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  let query = supabase
    .from('user_stats')
    .select('user_id, total_score, completed_sessions, level')
    .order('total_score', { ascending: false })
    .limit(limit)

  // 기간 필터링
  if (period === 'weekly') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    query = query.gte('updated_at', weekAgo.toISOString())
  } else if (period === 'monthly') {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    query = query.gte('updated_at', monthAgo.toISOString())
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch leaderboard: ${error.message}`)
  }

  // 순위 추가
  const entries: LeaderboardEntry[] = []
  
  // 순위 계산
  let rank = 1
  let previousScore = -1

  for (const stat of data || []) {
    if (stat.total_score !== previousScore) {
      rank = entries.length + 1
      previousScore = stat.total_score
    }

    // 현재 사용자 정보 가져오기 (자신의 정보만)
    let userEmail: string | undefined
    let userName: string | undefined
    
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id === stat.user_id) {
      userEmail = user.email
      userName = user.user_metadata?.name
    }

    entries.push({
      user_id: stat.user_id,
      total_score: stat.total_score,
      completed_sessions: stat.completed_sessions,
      level: stat.level,
      rank,
      user_email: userEmail,
      user_name: userName,
    })
  }

  return entries
}

/**
 * 현재 사용자의 리더보드 순위 가져오기
 */
export async function getUserRank(userId: string): Promise<number> {
  const { data: userStats, error: userError } = await supabase
    .from('user_stats')
    .select('total_score')
    .eq('user_id', userId)
    .single()

  if (userError || !userStats) {
    return 0
  }

  // 자신보다 높은 점수를 가진 사용자 수 + 1
  const { count, error } = await supabase
    .from('user_stats')
    .select('*', { count: 'exact', head: true })
    .gt('total_score', userStats.total_score)

  if (error) {
    throw new Error(`Failed to get user rank: ${error.message}`)
  }

  return (count || 0) + 1
}

/**
 * 현재 사용자의 리더보드 정보 가져오기 (순위 포함)
 */
export async function getCurrentUserLeaderboardInfo(): Promise<LeaderboardEntry | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userStats, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !userStats) {
    return null
  }

  const rank = await getUserRank(user.id)

  return {
    user_id: user.id,
    total_score: userStats.total_score,
    completed_sessions: userStats.completed_sessions,
    level: userStats.level,
    rank,
    user_email: user.email,
    user_name: user.user_metadata?.name,
  }
}

