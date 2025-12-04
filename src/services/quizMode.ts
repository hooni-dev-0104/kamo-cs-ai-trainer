import { QuizSet, QuizMaterial, QuizDifficulty, ManualQuizQuestion, QuizQuestion } from '../types/quiz'
import { generateQuizFromMaterials } from './quiz'
import { getManualQuestions } from './manualQuestions'

/**
 * 시험 모드에 따라 퀴즈를 생성합니다
 * - ai: AI가 자동 출제
 * - manual: 관리자가 직접 작성한 문제만 사용
 * - both: AI 출제 + 직접 작성 혼합
 */
export async function generateQuizByMode(
  material: QuizMaterial,
  difficulty: QuizDifficulty
): Promise<QuizSet> {
  const mode = material.quiz_mode || 'ai'

  // AI 자동 출제 모드
  if (mode === 'ai') {
    const settings = {
      total_questions: material.total_questions || 10,
      multiple_choice_count: material.multiple_choice_count || 5,
      true_false_count: material.true_false_count || 5,
      required_topics: material.required_topics || [],
      ai_prompt: material.ai_prompt
    }
    return await generateQuizFromMaterials(material.content, difficulty, settings)
  }

  // 직접 출제 모드
  if (mode === 'manual') {
    const manualQuestions = await getManualQuestions(material.id)
    
    if (manualQuestions.length === 0) {
      throw new Error('등록된 문제가 없습니다. 관리자에게 문의하세요.')
    }

    return {
      title: material.title,
      description: material.description || '관리자가 직접 출제한 시험입니다.',
      questions: manualQuestions.map(convertManualToQuizQuestion),
      materialId: material.id,
      difficulty
    }
  }

  // 혼합 모드
  if (mode === 'both') {
    // 먼저 직접 출제 문제를 가져옵니다
    const manualQuestions = await getManualQuestions(material.id)
    
    // 직접 출제 문제 수를 제외한 나머지를 AI가 생성
    const aiQuestionCount = Math.max(5, (material.total_questions || 10) - manualQuestions.length)
    
    const aiQuizSet = await generateQuizFromMaterials(material.content, difficulty, {
      total_questions: aiQuestionCount,
      multiple_choice_count: Math.min(material.multiple_choice_count || 5, aiQuestionCount),
      true_false_count: Math.min(material.true_false_count || 5, aiQuestionCount),
      required_topics: material.required_topics || [],
      ai_prompt: material.ai_prompt
    })

    // 직접 출제 문제와 AI 문제를 합침
    const combinedQuestions = [
      ...manualQuestions.map(convertManualToQuizQuestion),
      ...aiQuizSet.questions
    ]

    // ID 재정렬
    const reindexedQuestions = combinedQuestions.map((q, idx) => ({
      ...q,
      id: idx + 1
    }))

    return {
      title: material.title,
      description: material.description || 'AI 자동 출제와 직접 출제를 혼합한 시험입니다.',
      questions: reindexedQuestions,
      materialId: material.id,
      difficulty
    }
  }

  throw new Error('알 수 없는 출제 모드입니다.')
}

/**
 * ManualQuizQuestion을 QuizQuestion 형식으로 변환
 */
function convertManualToQuizQuestion(manual: ManualQuizQuestion): QuizQuestion {
  return {
    id: manual.order_index + 1,
    type: manual.question_type,
    question: manual.question,
    options: manual.options,
    correctAnswer: manual.question_type === 'true-false' 
      ? manual.correct_answer === 'true' 
      : manual.correct_answer,
    explanation: manual.explanation
  }
}

