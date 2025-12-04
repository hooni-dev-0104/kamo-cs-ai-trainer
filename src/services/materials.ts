import { supabase } from './supabase'
import { QuizMaterial } from '../types/quiz'

/**
 * 모든 학습 자료 목록 가져오기
 */
export async function getQuizMaterials(): Promise<QuizMaterial[]> {
  const { data, error } = await supabase
    .from('quiz_materials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch quiz materials: ${error.message}`)
  }

  return data as QuizMaterial[]
}

/**
 * 학습 자료 생성하기 (Admin 전용)
 */
export async function createQuizMaterial(
  title: string, 
  content: string, 
  description?: string
): Promise<QuizMaterial> {
  const { data, error } = await supabase
    .from('quiz_materials')
    .insert({
      title,
      content,
      description,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create quiz material: ${error.message}`)
  }

  return data as QuizMaterial
}

/**
 * 학습 자료 삭제하기 (Admin 전용)
 */
export async function deleteQuizMaterial(id: string): Promise<void> {
  const { error } = await supabase
    .from('quiz_materials')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete quiz material: ${error.message}`)
  }
}

/**
 * 재교육 기준 점수 업데이트 (Admin 전용)
 */
export async function updateRetrainingThreshold(
  materialId: string,
  threshold: number
): Promise<QuizMaterial> {
  if (threshold < 0 || threshold > 100) {
    throw new Error('재교육 기준 점수는 0-100 사이여야 합니다.')
  }

  const { data, error } = await supabase
    .from('quiz_materials')
    .update({ retraining_threshold: threshold })
    .eq('id', materialId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update retraining threshold: ${error.message}`)
  }

  return data as QuizMaterial
}

/**
 * 시험 제한시간 업데이트 (Admin 전용)
 */
export async function updateTimeLimit(
  materialId: string,
  timeLimit: number | null
): Promise<QuizMaterial> {
  if (timeLimit !== null && (timeLimit < 1 || timeLimit > 300)) {
    throw new Error('제한시간은 1-300분 사이여야 합니다.')
  }

  const { data, error} = await supabase
    .from('quiz_materials')
    .update({ time_limit: timeLimit })
    .eq('id', materialId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update time limit: ${error.message}`)
  }

  return data as QuizMaterial
}

/**
 * 시험 설정 업데이트 (Admin 전용)
 */
export async function updateQuizSettings(
  materialId: string,
  settings: {
    total_questions?: number
    multiple_choice_count?: number
    true_false_count?: number
    required_topics?: string[]
    quiz_mode?: 'ai' | 'manual' | 'both'
  }
): Promise<QuizMaterial> {
  // 유효성 검사
  if (settings.total_questions !== undefined && (settings.total_questions < 1 || settings.total_questions > 50)) {
    throw new Error('총 문항 수는 1-50 사이여야 합니다.')
  }

  if (settings.multiple_choice_count !== undefined && settings.true_false_count !== undefined) {
    const total = settings.multiple_choice_count + settings.true_false_count
    if (settings.total_questions && total !== settings.total_questions) {
      throw new Error('객관식과 OX 문항 수의 합이 총 문항 수와 일치해야 합니다.')
    }
  }

  const { data, error } = await supabase
    .from('quiz_materials')
    .update(settings)
    .eq('id', materialId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update quiz settings: ${error.message}`)
  }

  return {
    ...data,
    required_topics: data.required_topics as string[] | undefined,
  } as QuizMaterial
}

