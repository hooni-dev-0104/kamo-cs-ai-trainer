import { supabase } from './supabase'
import { Feedback, Session } from '../types'

export interface ScenarioFeedbackWithDetails extends Feedback {
  session: Session & {
    scenario_title?: string
    scenario_description?: string
  }
}

/**
 * 사용자의 모든 음성 상담 피드백 조회
 */
export async function getUserScenarioFeedbacks(userId: string): Promise<ScenarioFeedbackWithDetails[]> {
  const { data, error } = await supabase
    .from('feedbacks')
    .select(`
      *,
      responses!inner (
        session_id,
        sessions!inner (
          id,
          user_id,
          scenario_id,
          created_at
        )
      )
    `)
    .eq('responses.sessions.user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch scenario feedbacks: ${error.message}`)
  }

  // 시나리오 정보 가져오기
  const feedbacksWithScenario = await Promise.all(
    (data || []).map(async (feedback: any) => {
      const session = feedback.responses.sessions
      
      // 시나리오 정보 조회
      const { data: scenarioData } = await supabase
        .from('scenarios')
        .select('title, description')
        .eq('id', session.scenario_id)
        .single()

      return {
        id: feedback.id,
        response_id: feedback.response_id,
        feedback_json: feedback.feedback_json,
        created_at: feedback.created_at,
        session: {
          ...session,
          scenario_title: scenarioData?.title || '알 수 없는 시나리오',
          scenario_description: scenarioData?.description || '',
        },
      } as ScenarioFeedbackWithDetails
    })
  )

  return feedbacksWithScenario
}

/**
 * 특정 피드백 조회
 */
export async function getScenarioFeedbackById(feedbackId: string): Promise<ScenarioFeedbackWithDetails | null> {
  const { data, error } = await supabase
    .from('feedbacks')
    .select(`
      *,
      responses!inner (
        session_id,
        sessions!inner (
          id,
          user_id,
          scenario_id,
          created_at
        )
      )
    `)
    .eq('id', feedbackId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch scenario feedback: ${error.message}`)
  }

  const session = data.responses.sessions

  // 시나리오 정보 조회
  const { data: scenarioData } = await supabase
    .from('scenarios')
    .select('title, description')
    .eq('id', session.scenario_id)
    .single()

  return {
    id: data.id,
    response_id: data.response_id,
    feedback_json: data.feedback_json,
    created_at: data.created_at,
    session: {
      ...session,
      scenario_title: scenarioData?.title || '알 수 없는 시나리오',
      scenario_description: scenarioData?.description || '',
    },
  } as ScenarioFeedbackWithDetails
}

