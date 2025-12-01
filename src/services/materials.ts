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

