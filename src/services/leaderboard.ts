import { supabase } from './supabase'
import { LeaderboardEntry, LeaderboardPeriod, LeaderboardStatistics, QuestionStatistics } from '../types/gamification'

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

  // 현재 사용자 정보 가져오기
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  for (const stat of data || []) {
    if (stat.total_score !== previousScore) {
      rank = entries.length + 1
      previousScore = stat.total_score
    }

    // 사용자 프로필 정보 가져오기 (자신의 정보만 상세히, 다른 사용자는 익명 처리)
    let userEmail: string | undefined
    let userName: string | undefined
    
    if (currentUser && currentUser.id === stat.user_id) {
      // 자신의 정보는 상세히
      userEmail = currentUser.email
      userName = currentUser.user_metadata?.name
      
      // profiles 테이블에서도 확인
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', stat.user_id)
          .single()
        if (profile?.email) {
          userEmail = profile.email
        }
      } catch (err) {
        // 프로필 조회 실패 시 무시
      }
    } else {
      // 다른 사용자는 익명 처리 (이메일 마스킹)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', stat.user_id)
          .single()
        if (profile?.email) {
          // 이메일 마스킹 (예: abc@example.com -> a**@example.com)
          const [local, domain] = profile.email.split('@')
          if (local && domain) {
            userEmail = `${local[0]}**@${domain}`
          }
        }
      } catch (err) {
        // 프로필 조회 실패 시 무시
      }
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

/**
 * 리더보드 통계 정보 가져오기 (평균 점수, 중앙값, 커트라인 등)
 */
export async function getLeaderboardStatistics(
  period: LeaderboardPeriod = 'all'
): Promise<LeaderboardStatistics> {
  let query = supabase
    .from('user_stats')
    .select('total_score')

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
    throw new Error(`Failed to fetch leaderboard statistics: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return {
      total_users: 0,
      average_score: 0,
      median_score: 0,
      top_score: 0,
      cutoff_score: 0,
    }
  }

  const scores = data.map(s => s.total_score).sort((a, b) => b - a)
  const totalUsers = scores.length
  const sum = scores.reduce((acc, score) => acc + score, 0)
  const averageScore = Math.round(sum / totalUsers)
  const topScore = scores[0]
  
  // 중앙값 계산
  const medianIndex = Math.floor(totalUsers / 2)
  const medianScore = totalUsers % 2 === 0
    ? Math.round((scores[medianIndex - 1] + scores[medianIndex]) / 2)
    : scores[medianIndex]

  // 커트라인: 평균 점수의 70% 또는 하위 30% 기준
  const cutoffScore = Math.round(averageScore * 0.7)

  return {
    total_users: totalUsers,
    average_score: averageScore,
    median_score: medianScore,
    top_score: topScore,
    cutoff_score: cutoffScore,
  }
}

/**
 * 사용자의 상위 몇 %인지 계산
 */
export async function getUserPercentile(
  userId: string,
  period: LeaderboardPeriod = 'all'
): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return 0

  const { data: userStats, error: userError } = await supabase
    .from('user_stats')
    .select('total_score')
    .eq('user_id', userId)
    .single()

  if (userError || !userStats) {
    return 0
  }

  let query = supabase
    .from('user_stats')
    .select('total_score', { count: 'exact', head: false })

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

  const { data: allStats, error } = await query

  if (error || !allStats || allStats.length === 0) {
    return 0
  }

  // 자신보다 높은 점수를 가진 사용자 수
  const higherScoreCount = allStats.filter(s => s.total_score > userStats.total_score).length
  const percentile = Math.round((1 - higherScoreCount / allStats.length) * 100)

  return percentile
}

/**
 * 사용자가 재교육 대상인지 확인 (퀴즈 결과 기반)
 */
export async function checkRetrainingStatus(userId: string): Promise<{
  is_retraining_candidate: boolean
  failed_quizzes: Array<{
    material_id: string
    material_title: string
    latest_score: number
    threshold: number
    date: string
  }>
}> {
  // 최근 퀴즈 결과 중 재교육 대상인 것들 조회
  const { data: quizResults, error } = await supabase
    .from('quiz_results')
    .select(`
      id,
      score,
      created_at,
      quiz_sessions!inner(
        id,
        material_id,
        user_id,
        quiz_materials!inner(
          id,
          title,
          retraining_threshold
        )
      )
    `)
    .eq('quiz_sessions.user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to check retraining status: ${error.message}`)
  }

  const failedQuizzes: Array<{
    material_id: string
    material_title: string
    latest_score: number
    threshold: number
    date: string
  }> = []

  // 각 학습 자료별로 최신 점수 확인
  const materialMap = new Map<string, any>()

  for (const result of quizResults || []) {
    const session = result.quiz_sessions as any
    const material = session.quiz_materials as any
    const materialId = material.id
    const threshold = material.retraining_threshold || 70

    if (!materialMap.has(materialId)) {
      materialMap.set(materialId, {
        material_id: materialId,
        material_title: material.title,
        latest_score: result.score,
        threshold,
        date: result.created_at,
      })
    }
  }

  // 재교육 대상 확인 (점수가 기준 미만인 경우)
  for (const [, info] of materialMap.entries()) {
    if (info.latest_score < info.threshold) {
      failedQuizzes.push(info)
    }
  }

  return {
    is_retraining_candidate: failedQuizzes.length > 0,
    failed_quizzes: failedQuizzes,
  }
}

/**
 * 문항별 정답률/오답률 통계 가져오기
 */
export async function getQuestionStatistics(
  materialId?: string
): Promise<QuestionStatistics[]> {
  // 모든 퀴즈 결과에서 문항별 통계 계산
  let query = supabase
    .from('quiz_results')
    .select(`
      wrong_questions,
      user_answers,
      total_questions,
      correct_count,
      quiz_sessions!inner(
        material_id,
        quiz_materials!inner(
          id,
          title
        )
      )
    `)

  if (materialId) {
    query = query.eq('quiz_sessions.material_id', materialId)
  }

  const { data: results, error } = await query

  if (error) {
    throw new Error(`Failed to fetch question statistics: ${error.message}`)
  }

  // 문항별 통계 집계
  const questionMap = new Map<number, {
    question_id: number
    total_attempts: number
    correct_count: number
    incorrect_count: number
    material_id?: string
    material_title?: string
  }>()

  for (const result of results || []) {
    const session = result.quiz_sessions as any
    const material = session.quiz_materials as any
    const wrongQuestions = result.wrong_questions as number[]
    const totalQuestions = result.total_questions

    // 각 문항에 대해 통계 업데이트
    for (let i = 1; i <= totalQuestions; i++) {
      if (!questionMap.has(i)) {
        questionMap.set(i, {
          question_id: i,
          total_attempts: 0,
          correct_count: 0,
          incorrect_count: 0,
          material_id: material?.id,
          material_title: material?.title,
        })
      }

      const stats = questionMap.get(i)!
      stats.total_attempts++

      if (wrongQuestions.includes(i)) {
        stats.incorrect_count++
      } else {
        stats.correct_count++
      }
    }
  }

  // QuestionStatistics 형식으로 변환
  const statistics: QuestionStatistics[] = Array.from(questionMap.values()).map(stats => {
    const correctRate = stats.total_attempts > 0
      ? Math.round((stats.correct_count / stats.total_attempts) * 100)
      : 0
    const incorrectRate = 100 - correctRate

    return {
      question_id: stats.question_id,
      question_text: `문제 ${stats.question_id}`, // 실제 문제 텍스트는 별도로 가져와야 함
      total_attempts: stats.total_attempts,
      correct_count: stats.correct_count,
      incorrect_count: stats.incorrect_count,
      correct_rate: correctRate,
      incorrect_rate: incorrectRate,
      material_id: stats.material_id,
      material_title: stats.material_title,
    }
  })

  // 오답률이 높은 순으로 정렬
  return statistics.sort((a, b) => b.incorrect_rate - a.incorrect_rate)
}

