import { supabase } from './supabase'
import { Session, Response, Feedback } from '../types'

export async function createSession(scenarioId: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ scenario_id: scenarioId })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return data as Session
}

export async function createResponse(
  sessionId: string,
  audioUrl?: string,
  transcribedText?: string
): Promise<Response> {
  const { data, error } = await supabase
    .from('responses')
    .insert({
      session_id: sessionId,
      audio_url: audioUrl,
      transcribed_text: transcribedText,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create response: ${error.message}`)
  }

  return data as Response
}

export async function createFeedback(
  responseId: string,
  feedbackJson: Feedback['feedback_json']
): Promise<Feedback> {
  const { data, error } = await supabase
    .from('feedbacks')
    .insert({
      response_id: responseId,
      feedback_json: feedbackJson,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create feedback: ${error.message}`)
  }

  return data as Feedback
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get session: ${error.message}`)
  }

  return data as Session
}

