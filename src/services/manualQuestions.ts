import { supabase } from './supabase'
import { ManualQuizQuestion } from '../types/quiz'

/**
 * 특정 학습 자료의 직접 출제 문제 목록 가져오기
 */
export async function getManualQuestions(materialId: string): Promise<ManualQuizQuestion[]> {
  const { data, error } = await supabase
    .from('manual_quiz_questions')
    .select('*')
    .eq('material_id', materialId)
    .eq('is_active', true)
    .order('order_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch manual questions: ${error.message}`)
  }

  return (data || []).map(q => ({
    ...q,
    options: q.options as string[] | undefined,
  })) as ManualQuizQuestion[]
}

/**
 * 직접 출제 문제 생성
 */
export async function createManualQuestion(
  question: Omit<ManualQuizQuestion, 'id' | 'created_at' | 'updated_at' | 'created_by'>
): Promise<ManualQuizQuestion> {
  const { data, error } = await supabase
    .from('manual_quiz_questions')
    .insert({
      material_id: question.material_id,
      question_type: question.question_type,
      question: question.question,
      options: question.options || null,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      order_index: question.order_index,
      is_active: question.is_active,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create manual question: ${error.message}`)
  }

  return {
    ...data,
    options: data.options as string[] | undefined,
  } as ManualQuizQuestion
}

/**
 * 직접 출제 문제 수정
 */
export async function updateManualQuestion(
  questionId: string,
  updates: Partial<Omit<ManualQuizQuestion, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'material_id'>>
): Promise<ManualQuizQuestion> {
  const { data, error } = await supabase
    .from('manual_quiz_questions')
    .update(updates)
    .eq('id', questionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update manual question: ${error.message}`)
  }

  return {
    ...data,
    options: data.options as string[] | undefined,
  } as ManualQuizQuestion
}

/**
 * 직접 출제 문제 삭제 (비활성화)
 */
export async function deleteManualQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from('manual_quiz_questions')
    .update({ is_active: false })
    .eq('id', questionId)

  if (error) {
    throw new Error(`Failed to delete manual question: ${error.message}`)
  }
}

/**
 * 직접 출제 문제 순서 변경
 */
export async function reorderManualQuestions(
  materialId: string,
  questionIds: string[]
): Promise<void> {
  const updates = questionIds.map((id, index) => ({
    id,
    order_index: index,
  }))

  for (const update of updates) {
    const { error } = await supabase
      .from('manual_quiz_questions')
      .update({ order_index: update.order_index })
      .eq('id', update.id)

    if (error) {
      throw new Error(`Failed to reorder questions: ${error.message}`)
    }
  }
}

