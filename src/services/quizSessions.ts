import { supabase } from './supabase'
import { QuizSession, QuizResultRecord, QuizDifficulty } from '../types/quiz'

/**
 * 퀴즈 세션 생성
 */
export async function createQuizSession(
  materialId: string,
  difficulty: QuizDifficulty
): Promise<QuizSession> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated.')

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      material_id: materialId,
      user_id: user.id,
      difficulty,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create quiz session: ${error.message}`)
  }

  return data as QuizSession
}

/**
 * 퀴즈 결과 저장
 */
export async function saveQuizResult(
  sessionId: string,
  totalQuestions: number,
  correctCount: number,
  score: number,
  wrongQuestions: number[],
  userAnswers: Record<number, string | boolean>
): Promise<QuizResultRecord> {
  const { data, error } = await supabase
    .from('quiz_results')
    .insert({
      session_id: sessionId,
      total_questions: totalQuestions,
      correct_count: correctCount,
      score,
      wrong_questions: wrongQuestions,
      user_answers: userAnswers,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save quiz result: ${error.message}`)
  }

  return data as QuizResultRecord
}

