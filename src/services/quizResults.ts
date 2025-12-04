import { supabase } from './supabase'
import { QuizDifficulty } from '../types/quiz'

export interface UserQuizResult {
  id: string
  session_id: string
  user_id: string
  user_email: string
  user_name: string
  material_id: string
  material_title: string
  difficulty: QuizDifficulty
  score: number
  total_questions: number
  correct_count: number
  wrong_questions: number[]
  created_at: string
}

/**
 * 이메일로 사용자 검색 (관리자용)
 * @param emailQuery 검색할 이메일 (부분 검색 지원)
 */
export async function searchUsersByEmail(emailQuery: string): Promise<Array<{ id: string; email: string }>> {
  try {
    console.log('🔍 이메일 검색 시작:', emailQuery)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .ilike('email', `%${emailQuery}%`)
      .order('email', { ascending: true })
      .limit(20)

    console.log('📊 검색 결과:', {
      query: emailQuery,
      totalCount: data?.length || 0,
      results: data?.map(u => ({ email: u.email, role: u.role }))
    })

    if (error) {
      console.error('❌ 검색 에러:', error)
      throw new Error(`사용자 검색 실패: ${error.message}`)
    }

    console.log('✅ 최종 검색 결과 (관리자 포함):', {
      count: data?.length || 0,
      emails: data?.map(u => u.email)
    })

    return (data || []).map(u => ({ id: u.id, email: u.email }))
  } catch (error) {
    console.error('❌ searchUsersByEmail error:', error)
    throw error
  }
}

/**
 * 특정 사용자의 시험 결과 조회 (관리자용)
 * @param userId 사용자 ID
 * @param startDate 조회 시작 날짜 (ISO string, optional)
 * @param endDate 조회 종료 날짜 (ISO string, optional)
 */
export async function getUserQuizResults(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<UserQuizResult[]> {
  try {
    // 1. 사용자 정보 가져오기
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(`사용자 정보 조회 실패: ${userError.message}`)
    }

    // 2. 퀴즈 세션 조회 (날짜 필터 적용)
    let sessionQuery = supabase
      .from('quiz_sessions')
      .select('id, material_id, difficulty, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (startDate) {
      sessionQuery = sessionQuery.gte('created_at', startDate)
    }
    if (endDate) {
      // endDate의 23:59:59까지 포함하기 위해 다음 날 00:00:00으로 설정
      const endDateTime = new Date(endDate)
      endDateTime.setDate(endDateTime.getDate() + 1)
      sessionQuery = sessionQuery.lt('created_at', endDateTime.toISOString())
    }

    const { data: sessions, error: sessionError } = await sessionQuery

    if (sessionError) {
      throw new Error(`퀴즈 세션 조회 실패: ${sessionError.message}`)
    }

    if (!sessions || sessions.length === 0) {
      return []
    }

    // 3. 각 세션의 결과 조회
    const sessionIds = sessions.map(s => s.id)
    const { data: results, error: resultError } = await supabase
      .from('quiz_results')
      .select('*')
      .in('session_id', sessionIds)

    if (resultError) {
      throw new Error(`퀴즈 결과 조회 실패: ${resultError.message}`)
    }

    if (!results || results.length === 0) {
      return []
    }

    // 4. 학습 자료 정보 조회
    const materialIds = [...new Set(sessions.map(s => s.material_id))]
    const { data: materials, error: materialError } = await supabase
      .from('quiz_materials')
      .select('id, title')
      .in('id', materialIds)

    if (materialError) {
      console.error('학습 자료 조회 실패:', materialError)
    }

    // 5. 데이터 조합
    const materialMap = new Map(materials?.map(m => [m.id, m.title]) || [])
    
    const combinedResults: UserQuizResult[] = results.map(result => {
      const session = sessions.find(s => s.id === result.session_id)
      return {
        id: result.id,
        session_id: result.session_id,
        user_id: userId,
        user_email: userProfile.email,
        user_name: userProfile.email,
        material_id: session?.material_id || '',
        material_title: materialMap.get(session?.material_id || '') || '알 수 없음',
        difficulty: session?.difficulty || 'easy',
        score: result.score,
        total_questions: result.total_questions,
        correct_count: result.correct_count,
        wrong_questions: result.wrong_questions,
        created_at: result.created_at,
      }
    })

    return combinedResults
  } catch (error) {
    console.error('getUserQuizResults error:', error)
    throw error
  }
}

/**
 * 모든 사용자의 최근 시험 결과 조회 (관리자용)
 * @param limit 조회할 최대 개수
 */
export async function getAllRecentQuizResults(limit: number = 50): Promise<UserQuizResult[]> {
  try {
    // 1. 최근 퀴즈 결과 조회
    const { data: results, error: resultError } = await supabase
      .from('quiz_results')
      .select(`
        *,
        quiz_sessions (
          user_id,
          material_id,
          difficulty,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (resultError) {
      throw new Error(`퀴즈 결과 조회 실패: ${resultError.message}`)
    }

    if (!results || results.length === 0) {
      return []
    }

    // 2. 사용자 정보 조회
    const userIds = [...new Set(results.map((r: any) => r.quiz_sessions.user_id))]
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)

    if (userError) {
      console.error('사용자 정보 조회 실패:', userError)
    }

    const userMap = new Map(users?.map(u => [u.id, u.email]) || [])

    // 3. 학습 자료 정보 조회
    const materialIds = [...new Set(results.map((r: any) => r.quiz_sessions.material_id))]
    const { data: materials, error: materialError } = await supabase
      .from('quiz_materials')
      .select('id, title')
      .in('id', materialIds)

    if (materialError) {
      console.error('학습 자료 조회 실패:', materialError)
    }

    const materialMap = new Map(materials?.map(m => [m.id, m.title]) || [])

    // 4. 데이터 조합
    const combinedResults: UserQuizResult[] = results.map((result: any) => {
      const session = result.quiz_sessions
      const userEmail = userMap.get(session.user_id) || '알 수 없음'
      
      return {
        id: result.id,
        session_id: result.session_id,
        user_id: session.user_id,
        user_email: userEmail,
        user_name: userEmail,
        material_id: session.material_id,
        material_title: materialMap.get(session.material_id) || '알 수 없음',
        difficulty: session.difficulty,
        score: result.score,
        total_questions: result.total_questions,
        correct_count: result.correct_count,
        wrong_questions: result.wrong_questions,
        created_at: result.created_at,
      }
    })

    return combinedResults
  } catch (error) {
    console.error('getAllRecentQuizResults error:', error)
    throw error
  }
}

