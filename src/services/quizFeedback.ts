import { supabase } from './supabase'
import { QuizFeedback, WeakArea, WrongQuestionAnalysis } from '../types/quiz'
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
): Promise<{ 
  recommendedFeedback: string
  wrongQuestionAnalysis: WrongQuestionAnalysis[]
  weakAreas: WeakArea[]
  overallRecommendation: string
}> {
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
    .map((q: any) => {
      const userAnswerStr = typeof q.userAnswer === 'boolean' 
        ? (q.userAnswer ? 'O (참)' : 'X (거짓)')
        : q.userAnswer || '(응답 없음)'
      
      const correctAnswerStr = typeof q.correctAnswer === 'boolean'
        ? (q.correctAnswer ? 'O (참)' : 'X (거짓)')
        : q.correctAnswer
      
      return `[문제 ${q.id}]
질문: ${q.question}
사용자가 선택한 답: ${userAnswerStr}
올바른 정답: ${correctAnswerStr}
해설: ${q.explanation}`
    })
    .join('\n\n' + '='.repeat(80) + '\n\n')

  const prompt = `당신은 카카오모빌리티의 고객 서비스 교육 전문가이자 학습 분석 전문가입니다. 

학습자가 시험에서 틀린 문제들을 분석하여, 실무에 즉시 활용할 수 있는 매우 구체적이고 상세한 피드백을 작성해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 시험 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 시험명: ${materialTitle}
• 획득 점수: ${score}점 / 100점 (${Math.round((correctCount / totalQuestions) * 100)}% 정답률)
• 정답: ${correctCount}개 / 총 ${totalQuestions}문제
• 오답: ${wrongQuestions.length}개

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ 틀린 문제 상세 (각 문제의 해설 포함)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${wrongQuestionsText || '틀린 문제 없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 피드백 작성 가이드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**중요: 각 틀린 문제에 대해 최소 150자 이상의 상세한 분석을 제공해야 합니다.**

1️⃣ **틀린 문제별 심층 분석** (각 문제당 최소 150자 이상):
   
   A. 오답 분석 (50자 이상):
      • 왜 이 오답을 선택했을까요? (심리적 요인, 개념 혼동 등)
      • 이 오답이 틀린 구체적인 이유
      • 오답과 정답의 핵심적인 차이점
   
   B. 정답 해설 (50자 이상):
      • 정답이 맞는 이유를 단계별로 설명
      • 위의 "해설"을 참고하되, 더 쉽고 구체적으로 재해석
      • 핵심 개념을 실무 상황과 연결
   
   C. 실무 적용 예시 (30자 이상):
      • 실제 고객 상담에서 이 지식을 어떻게 사용하는지
      • 구체적인 대화 예시나 상황 시뮬레이션
   
   D. 학습 팁 (20자 이상):
      • 이런 유형의 문제를 맞히려면 무엇을 기억해야 하는지
      • 암기 팁, 연상법, 체크리스트 등

2️⃣ **취약 영역 분석**:
   • 틀린 문제들의 공통 주제/패턴 파악
   • 각 취약 영역별로:
     - 무엇이 부족한지 (구체적으로)
     - 어떻게 개선할지 (실천 가능한 3단계 이상)
     - 우선순위 (high: 즉시 개선 필요, medium: 보완 필요, low: 추후 보완)

3️⃣ **전체 학습 권장사항** (200자 이상):
   • 다음 시험까지 무엇을 해야 하는지
   • 어떤 자료를 다시 봐야 하는지
   • 실무 연습 방법 (롤플레이, 시나리오 분석 등)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 주의사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 추상적이고 일반적인 표현 금지 ("더 공부하세요", "복습하세요" 등)
• 모든 설명은 구체적인 예시와 함께 제공
• 실무 중심의 실천 가능한 조언만 제공
• 각 틀린 문제마다 최소 150자 이상의 상세 분석 필수
• 학습자가 즉시 행동할 수 있는 명확한 가이드 제공

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 응답 형식 (JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "recommendedFeedback": "전체 시험 결과에 대한 종합 피드백. 학습자의 강점과 약점을 균형있게 언급하고, 구체적인 개선 방향을 제시하세요. (400-600자)",
  
  "wrongQuestionAnalysis": [
    {
      "questionId": 문제번호,
      "questionText": "문제 내용 그대로 복사",
      "userAnswer": "사용자가 선택한 답변",
      "correctAnswer": "올바른 정답",
      "whyWrong": "왜 오답을 선택했는지 + 오답이 틀린 이유 + 오답과 정답의 차이점. 구체적이고 상세하게 최소 80자 이상 작성하세요.",
      "keyConceptExplanation": "정답 해설 + 핵심 개념 설명 + 실무 적용 예시. 실제 고객 상담 상황에서 어떻게 사용하는지 구체적 예시 포함. 최소 100자 이상 작성하세요.",
      "learningTip": "이 유형의 문제를 맞히기 위한 구체적인 암기법, 체크리스트, 연상법 등. 실천 가능한 조언만 제공. 최소 50자 이상 작성하세요."
    }
  ],
  
  "weakAreas": [
    {
      "area": "취약 영역명 (예: '카카오 T 정책 이해', '고객 공감 표현', '환불 규정 적용')",
      "description": "이 영역에서 무엇이 부족한지 구체적으로 설명 (최소 50자)",
      "improvementPlan": "단계별 개선 방법. 1단계: ..., 2단계: ..., 3단계: ... 형식으로 실천 가능한 구체적 계획 제시 (최소 100자)",
      "questions": [해당 취약 영역과 관련된 문제 ID들],
      "priority": "high" 또는 "medium" 또는 "low" (high: 업무에 즉시 영향, medium: 보완 필요, low: 추후 개선)
    }
  ],
  
  "overallRecommendation": "전체적인 학습 방향과 다음 단계. 다음 시험까지 무엇을 해야 하는지, 어떤 자료를 볼지, 어떻게 연습할지 구체적으로 제시. 실무 적용 연습 방법 포함 (최소 250자 이상)"
}

⚠️ JSON만 응답하고 다른 텍스트는 절대 포함하지 마세요.
⚠️ 모든 분석은 구체적이고 실용적이며 실천 가능해야 합니다.
⚠️ 각 필드의 최소 글자 수를 반드시 지켜주세요.`

  try {
    console.log('🚀 AI 피드백 생성 요청 중...')
    console.log('틀린 문제 수:', wrongQuestions.length)
    
    const response = await generateFeedbackRecommendation(prompt)
    
    console.log('✅ AI 피드백 생성 성공!')
    console.log('- recommendedFeedback 길이:', response.recommendedFeedback?.length || 0, '자')
    console.log('- wrongQuestionAnalysis 개수:', response.wrongQuestionAnalysis?.length || 0)
    console.log('- weakAreas 개수:', response.weakAreas?.length || 0)
    console.log('- overallRecommendation 길이:', response.overallRecommendation?.length || 0, '자')
    
    // 각 틀린 문제 분석 길이 확인
    response.wrongQuestionAnalysis?.forEach((analysis, idx) => {
      console.log(`  문제 ${analysis.questionId}:`, {
        whyWrong: analysis.whyWrong?.length || 0,
        keyConceptExplanation: analysis.keyConceptExplanation?.length || 0,
        learningTip: analysis.learningTip?.length || 0
      }, '자')
    })
    
    return {
      recommendedFeedback: response.recommendedFeedback,
      wrongQuestionAnalysis: response.wrongQuestionAnalysis || [],
      weakAreas: response.weakAreas || [],
      overallRecommendation: response.overallRecommendation || '',
    }
  } catch (error) {
    console.error('❌ AI 피드백 생성 실패:', error)
    // 기본 피드백 반환
    return {
      recommendedFeedback: `시험 결과 ${score}점을 받으셨습니다. 틀린 문제를 다시 확인하고 학습 자료를 복습해주세요.`,
      wrongQuestionAnalysis: [],
      weakAreas: [],
      overallRecommendation: '학습 자료를 다시 복습하고 틀린 문제를 중점적으로 학습해주세요.',
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
  weakAreas?: { areas: string[]; details: WeakArea[] },
  wrongQuestionAnalysis?: WrongQuestionAnalysis[],
  overallRecommendation?: string
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
      wrong_question_analysis: wrongQuestionAnalysis,
      overall_recommendation: overallRecommendation,
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

