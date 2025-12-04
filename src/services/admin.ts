import { supabase } from './supabase'
import { QuizStatistics, RetrainingCandidate, QuizAttemptRecord } from '../types/quiz'

/**
 * 모든 시험의 통계 정보 가져오기 (관리자 전용)
 */
export async function getQuizStatistics(): Promise<QuizStatistics[]> {
  // 각 학습 자료별 통계 계산
  // retraining_threshold 컬럼이 없을 수 있으므로 먼저 시도하고, 실패하면 기본값 사용
  let materials: any[] = []
  
  try {
    // retraining_threshold 포함하여 조회 시도
    const { data, error } = await supabase
      .from('quiz_materials')
      .select('id, title, retraining_threshold')
    
    if (error) throw error
    materials = data || []
    console.log('Loaded materials:', materials.length)
  } catch (err: any) {
    // retraining_threshold 컬럼이 없으면 기본 컬럼만 조회
    if (err.message?.includes('retraining_threshold')) {
      const { data, error } = await supabase
        .from('quiz_materials')
        .select('id, title')
      
      if (error) {
        throw new Error(`Failed to fetch materials: ${error.message}`)
      }
      
      materials = (data || []).map((m: any) => ({
        ...m,
        retraining_threshold: 70 // 기본값
      }))
    } else {
      throw new Error(`Failed to fetch materials: ${err.message}`)
    }
  }

  const statistics: QuizStatistics[] = []

  for (const material of materials) {
    // 해당 자료의 모든 세션 가져오기
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, user_id')
      .eq('material_id', material.id)

    if (sessionsError) {
      console.error(`Failed to fetch sessions for material ${material.id}:`, sessionsError)
      continue
    }

    console.log(`Material ${material.title}: ${sessions?.length || 0} sessions`)

    const sessionIds = (sessions || []).map(s => s.id)
    const uniqueUserIds = new Set((sessions || []).map(s => s.user_id))

    if (sessionIds.length === 0) {
      statistics.push({
        material_id: material.id,
        material_title: material.title,
        total_sessions: 0,
        total_users: 0,
        average_score: 0,
        retraining_count: 0,
        retraining_threshold: material.retraining_threshold || 70,
      })
      continue
    }

    // 해당 세션들의 결과 가져오기
    const { data: results, error: resultsError } = await supabase
      .from('quiz_results')
      .select('score, session_id')
      .in('session_id', sessionIds)

    if (resultsError) {
      console.error(`Failed to fetch results for material ${material.id}:`, resultsError)
      continue
    }

    console.log(`Material ${material.title}: ${results?.length || 0} results`)

    const scores = (results || []).map(r => r.score)
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0

    const threshold = material.retraining_threshold || 70
    const retrainingCount = scores.filter(score => score < threshold).length

    statistics.push({
      material_id: material.id,
      material_title: material.title,
      total_sessions: sessionIds.length,
      total_users: uniqueUserIds.size,
      average_score: averageScore,
      retraining_count: retrainingCount,
      retraining_threshold: threshold,
    })
  }

  return statistics
}

/**
 * 재교육 대상 사용자 목록 가져오기 (관리자 전용)
 */
export async function getRetrainingCandidates(): Promise<RetrainingCandidate[]> {
  // 모든 학습 자료 가져오기
  // retraining_threshold 컬럼이 없을 수 있으므로 먼저 시도하고, 실패하면 기본값 사용
  let materials: any[] = []
  
  try {
    // retraining_threshold 포함하여 조회 시도
    const { data, error } = await supabase
      .from('quiz_materials')
      .select('id, title, retraining_threshold')
    
    if (error) throw error
    materials = data || []
  } catch (err: any) {
    // retraining_threshold 컬럼이 없으면 기본 컬럼만 조회
    if (err.message?.includes('retraining_threshold')) {
      const { data, error } = await supabase
        .from('quiz_materials')
        .select('id, title')
      
      if (error) {
        throw new Error(`Failed to fetch materials: ${error.message}`)
      }
      
      materials = (data || []).map((m: any) => ({
        ...m,
        retraining_threshold: 70 // 기본값
      }))
    } else {
      throw new Error(`Failed to fetch materials: ${err.message}`)
    }
  }

  const candidates: RetrainingCandidate[] = []

  for (const material of materials) {
    const threshold = material.retraining_threshold || 70

    // 해당 자료의 모든 세션 가져오기 (사용자별로 그룹화)
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, user_id, created_at')
      .eq('material_id', material.id)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error(`Failed to fetch sessions for material ${material.id}:`, sessionsError)
      continue
    }

    // 사용자별로 그룹화
    const userSessions = new Map<string, typeof sessions>()
    for (const session of sessions || []) {
      if (!userSessions.has(session.user_id)) {
        userSessions.set(session.user_id, [])
      }
      userSessions.get(session.user_id)!.push(session)
    }

    // 각 사용자의 최신 결과 확인
    for (const [userId, userSessionList] of userSessions.entries()) {
      const latestSession = userSessionList[0] // 가장 최근 세션

      // 최신 세션의 결과 가져오기
      const { data: result, error: resultError } = await supabase
        .from('quiz_results')
        .select('score')
        .eq('session_id', latestSession.id)
        .single()

      if (resultError || !result) {
        continue // 결과가 없으면 스킵
      }

      // 재교육 대상인지 확인 (최신 점수가 기준 미만)
      if (result.score < threshold) {
        // 사용자 이메일 가져오기 (profiles 테이블에서)
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single()

        const userEmail = profile?.email || '알 수 없음'

        candidates.push({
          user_id: userId,
          user_email: userEmail,
          material_id: material.id,
          material_title: material.title,
          latest_score: result.score,
          latest_session_date: latestSession.created_at,
          attempt_count: userSessionList.length,
        })
      }
    }
  }

  // 최신 세션 날짜 기준으로 정렬
  return candidates.sort((a, b) => 
    new Date(b.latest_session_date).getTime() - new Date(a.latest_session_date).getTime()
  )
}

/**
 * 모든 응시 기록 가져오기 (관리자 전용) - 누가 어떤 시험을 봤는지 목록
 */
export async function getAllQuizAttempts(): Promise<QuizAttemptRecord[]> {
  // 모든 퀴즈 세션 가져오기
  const { data: sessions, error: sessionsError } = await supabase
    .from('quiz_sessions')
    .select('id, material_id, user_id, difficulty, created_at')
    .order('created_at', { ascending: false })

  if (sessionsError) {
    console.error('Failed to fetch quiz sessions:', sessionsError)
    throw new Error(`Failed to fetch quiz attempts: ${sessionsError.message}`)
  }

  const attempts: QuizAttemptRecord[] = []

  for (const session of sessions || []) {
    // 해당 세션의 결과 가져오기
    const { data: results, error: resultsError } = await supabase
      .from('quiz_results')
      .select('score, total_questions, correct_count')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (resultsError || !results || results.length === 0) {
      console.log(`No results for session ${session.id}`)
      continue // 결과가 없으면 스킵
    }

    const result = results[0]

    // 학습 자료 제목 가져오기
    const { data: material } = await supabase
      .from('quiz_materials')
      .select('title')
      .eq('id', session.material_id)
      .single()

    // 사용자 이메일 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', session.user_id)
      .single()

    attempts.push({
      user_id: session.user_id,
      user_email: profile?.email || '알 수 없음',
      material_id: session.material_id,
      material_title: material?.title || '알 수 없음',
      session_id: session.id,
      score: result.score,
      total_questions: result.total_questions,
      correct_count: result.correct_count,
      difficulty: (session.difficulty || 'medium') as any,
      created_at: session.created_at,
    })
  }

  console.log(`Loaded ${attempts.length} quiz attempts`)
  return attempts
}

