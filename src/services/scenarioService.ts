import { supabase } from './supabase'
import { Scenario } from '../types'

/**
 * 모든 시나리오 가져오기
 */
export async function getAllScenarios(): Promise<Scenario[]> {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch scenarios: ${error.message}`)
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    customerScript: row.customer_script,
    customerPrompt: row.customer_prompt || undefined,
    context: row.context,
    emotion: (row.emotion || 'frustrated') as 'angry' | 'normal' | 'sad' | 'frustrated',
  }))
}

/**
 * 시나리오 ID로 가져오기
 */
export async function getScenarioById(id: string): Promise<Scenario | null> {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // 데이터 없음
    }
    throw new Error(`Failed to fetch scenario: ${error.message}`)
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    customerScript: data.customer_script,
    customerPrompt: data.customer_prompt || undefined,
    context: data.context,
    emotion: (data.emotion || 'frustrated') as 'angry' | 'normal' | 'sad' | 'frustrated',
  }
}

/**
 * 시나리오 생성 (관리자 전용)
 */
export async function createScenario(scenario: Omit<Scenario, 'id'> & { id?: string }): Promise<Scenario> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated.')

  // ID가 없으면 자동 생성 (타임스탬프 기반)
  const id = scenario.id || `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      id,
      title: scenario.title,
      description: scenario.description,
      customer_script: scenario.customerScript,
      customer_prompt: scenario.customerPrompt || null,
      context: scenario.context,
      emotion: scenario.emotion || 'frustrated',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create scenario: ${error.message}`)
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    customerScript: data.customer_script,
    customerPrompt: data.customer_prompt || undefined,
    context: data.context,
    emotion: (data.emotion || 'frustrated') as 'angry' | 'normal' | 'sad' | 'frustrated',
  }
}

/**
 * 시나리오 수정 (관리자 전용)
 */
export async function updateScenario(id: string, scenario: Partial<Omit<Scenario, 'id'>>): Promise<Scenario> {
  const updateData: any = {}
  
  if (scenario.title !== undefined) updateData.title = scenario.title
  if (scenario.description !== undefined) updateData.description = scenario.description
  if (scenario.customerScript !== undefined) updateData.customer_script = scenario.customerScript
  if (scenario.customerPrompt !== undefined) updateData.customer_prompt = scenario.customerPrompt || null
  if (scenario.context !== undefined) updateData.context = scenario.context
  if (scenario.emotion !== undefined) updateData.emotion = scenario.emotion

  const { data, error } = await supabase
    .from('scenarios')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update scenario: ${error.message}`)
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    customerScript: data.customer_script,
    customerPrompt: data.customer_prompt || undefined,
    context: data.context,
    emotion: (data.emotion || 'frustrated') as 'angry' | 'normal' | 'sad' | 'frustrated',
  }
}

/**
 * 시나리오 삭제 (관리자 전용)
 */
export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete scenario: ${error.message}`)
  }
}

