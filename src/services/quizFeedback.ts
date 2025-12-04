import { supabase } from './supabase'
import { QuizFeedback, WeakArea } from '../types/quiz'
import { generateFeedbackRecommendation } from './google-cloud'

/**
 * AI 기반 피드백 추천 생성
 */
export async function generateAIFeedbackRecommendation(
  materialTitle: string,
  score: number,
  totalQuestions: number,
  correctCount: number,
  wrongQuestions: number[],
  userAnswers: Record<number, string | boolean>,
  quizQuestions: Array<{ id: number; question: string; correctAnswer: string | boolean; explanation: string }>
): Promise<{ recommendedFeedback: string; weakAreas: WeakArea[] }> {
  // 틀린 문제 분석
  const wrongQuestionsData = wrongQuestions
    .map(id => {
      const question = quizQuestions.find(q => q.id === id)
      if (!question) return null
      return {
        id,
        question: question.question,
        userAnswer: userAnswers[id],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      }
    })
    .filter(Boolean)

  const wrongQuestionsText = wrongQuestionsData
    .map((q: any) => `문제 ${q.id}: ${q.question}\n사용자 답: ${q.userAnswer}\n정답: ${q.correctAnswer}\n해설: ${q.explanation}`)
    .join('\n\n')

  const prompt = `당신은 고객 서비스 교육 전문가입니다. 다음 시험 결과를 분석하여 틀린 문항에 대한 구체적인 피드백을 작성해주세요.

[시험 정보]
- 시험명: ${materialTitle}
- 점수: ${score}점 / 100점
- 정답률: ${correctCount}/${totalQuestions} (${Math.round((correctCount / totalQuestions) * 100)}%)

[틀린 문제 상세]
${wrongQuestionsText || '틀린 문제 없음'}

[요청 사항]
1. 각 틀린 문항에 대해 다음을 분석해주세요:
   - 왜 틀렸는지 (사용자 답안과 정답의 차이점)
   - 해당 문제에서 요구하는 핵심 개념
   - 올바른 이해를 위한 구체적인 설명
2. 틀린 문항들을 주제별로 그룹화하여 취약 영역을 도출해주세요.
3. 전체 피드백은 틀린 문항별 분석을 중심으로 작성하고, 격려보다는 구체적인 학습 방향을 제시해주세요.
4. 다음 JSON 형식으로 응답해주세요:

{
  "recommendedFeedback": "틀린 문항별 구체적인 피드백 내용 (각 틀린 문항에 대한 분석 포함, 300-500자)",
  "weakAreas": [
    {
      "area": "취약 영역명 (예: 카카오 T 정책 이해)",
      "description": "해당 영역에서 부족한 점과 개선 방향",
      "questions": [문제 ID 배열]
    }
  ]
}

JSON만 응답하고 다른 텍스트는 포함하지 마세요.`

  try {
    const response = await generateFeedbackRecommendation(prompt)
    return response
  } catch (error) {
    console.error('Failed to generate AI feedback:', error)
    // 기본 피드백 반환
    return {
      recommendedFeedback: `시험 결과 ${score}점을 받으셨습니다. 틀린 문제를 다시 확인하고 학습 자료를 복습해주세요.`,
      weakAreas: [],
    }
  }
}

/**
 * 피드백 생성 (관리자용)
 */
export async function createQuizFeedback(
  quizResultId: string,
  userId: string,
  materialId: string,
  feedbackText: string,
  aiRecommendedFeedback?: string,
  weakAreas?: { areas: string[]; details: WeakArea[] }
): Promise<QuizFeedback> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated.')

  const { data, error } = await supabase
    .from('quiz_feedbacks')
    .insert({
      quiz_result_id: quizResultId,
      user_id: userId,
      material_id: materialId,
      feedback_text: feedbackText,
      ai_recommended_feedback: aiRecommendedFeedback,
      weak_areas: weakAreas,
      created_by: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create quiz feedback: ${error.message}`)
  }

  return data as QuizFeedback
}

/**
 * 사용자의 피드백 목록 가져오기
 */
export async function getUserQuizFeedbacks(userId: string): Promise<QuizFeedback[]> {
  const { data, error } = await supabase
    .from('quiz_feedbacks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch quiz feedbacks: ${error.message}`)
  }

  return (data || []) as QuizFeedback[]
}

/**
 * 특정 퀴즈 결과의 피드백 가져오기
 */
export async function getQuizFeedbackByResultId(quizResultId: string): Promise<QuizFeedback | null> {
  const { data, error } = await supabase
    .from('quiz_feedbacks')
    .select('*')
    .eq('quiz_result_id', quizResultId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch quiz feedback: ${error.message}`)
  }

  return data as QuizFeedback | null
}

/**
 * 피드백 업데이트 (관리자용)
 */
export async function updateQuizFeedback(
  feedbackId: string,
  updates: {
    feedback_text?: string
    status?: 'pending' | 'sent' | 'read'
    email_sent_at?: string
  }
): Promise<QuizFeedback> {
  const { data, error } = await supabase
    .from('quiz_feedbacks')
    .update(updates)
    .eq('id', feedbackId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update quiz feedback: ${error.message}`)
  }

  return data as QuizFeedback
}

/**
 * 피드백 읽음 처리 (사용자용)
 */
export async function markFeedbackAsRead(feedbackId: string): Promise<void> {
  const { error } = await supabase
    .from('quiz_feedbacks')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)

  if (error) {
    throw new Error(`Failed to mark feedback as read: ${error.message}`)
  }
}

/**
 * 모든 피드백 가져오기 (관리자용)
 */
export async function getAllQuizFeedbacks(): Promise<QuizFeedback[]> {
  const { data, error } = await supabase
    .from('quiz_feedbacks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch quiz feedbacks: ${error.message}`)
  }

  return (data || []) as QuizFeedback[]
}

