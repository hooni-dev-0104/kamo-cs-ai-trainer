import { useState, useEffect } from 'react'
import { QuizSet, QuizResult as QuizResultType } from '../../types/quiz'
import { getQuizMaterials } from '../../services/materials'

interface QuizResultProps {
  quizSet: QuizSet
  result: QuizResultType
  onRetry: () => void
  onHome: () => void
}

export default function QuizResult({ quizSet, result, onRetry, onHome }: QuizResultProps) {
  const [retrainingThreshold, setRetrainingThreshold] = useState<number>(70)

  useEffect(() => {
    const loadThreshold = async () => {
      if (!quizSet.materialId) {
        return
      }
      try {
        const materials = await getQuizMaterials()
        const material = materials.find(m => m.id === quizSet.materialId)
        if (material?.retraining_threshold) {
          setRetrainingThreshold(material.retraining_threshold)
        }
      } catch (err) {
        // 기본값 사용
      }
    }
    loadThreshold()
  }, [quizSet.materialId])

  const isPass = result.score >= retrainingThreshold
  const isRetrainingCandidate = result.score < retrainingThreshold

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 점수 카드 */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-8 text-center">
        <div className={`p-8 ${isPass ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          <h2 className="text-2xl font-bold mb-2">
            {isPass ? '🎉 합격입니다!' : '💪 조금만 더 노력해보세요!'}
          </h2>
          <div className="text-6xl font-extrabold mb-2">
            {result.score}점
          </div>
          <p className="opacity-90">
            총 {result.totalQuestions}문제 중 {result.correctCount}문제 정답
          </p>
          {isRetrainingCandidate && (
            <div className="mt-4 p-4 bg-yellow-500 bg-opacity-20 rounded-lg border border-yellow-300">
              <p className="text-sm font-semibold">
                ⚠️ 재교육 대상입니다 (기준: {retrainingThreshold}점)
              </p>
              <p className="text-xs mt-1 opacity-90">
                관리자로부터 피드백을 받을 예정입니다. 이메일을 확인해주세요.
              </p>
            </div>
          )}
        </div>
        
        <div className="p-6 flex justify-center gap-4 bg-gray-50">
          <button
            onClick={onRetry}
            className="px-6 py-2 border border-gray-300 rounded-full font-semibold text-gray-700 hover:bg-white transition-colors"
          >
            다시 풀기
          </button>
          <button
            onClick={onHome}
            className="px-6 py-2 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
          >
            다른 자료로 시험 보기
          </button>
        </div>
      </div>

      {/* 오답 노트 및 해설 */}
      <h3 className="text-xl font-bold text-gray-800 mb-4 ml-2">📝 상세 해설 및 오답 노트</h3>
      <div className="space-y-6">
        {quizSet.questions.map((question, idx) => {
          const isCorrect = !result.wrongQuestions.includes(question.id)
          const userAnswer = result.userAnswers[question.id]

          return (
            <div 
              key={question.id} 
              className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${
                isCorrect ? 'border-green-100' : 'border-red-100'
              }`}
            >
              <div className="flex gap-3 mb-3">
                <span className={`
                  w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white
                  ${isCorrect ? 'bg-green-500' : 'bg-red-500'}
                `}>
                  {isCorrect ? 'O' : 'X'}
                </span>
                <h4 className="text-lg font-semibold text-gray-900 pt-1">
                  Q{idx + 1}. {question.question}
                </h4>
              </div>

              <div className="ml-11 space-y-3">
                {/* 객관식 보기 표시 */}
                {question.type === 'multiple-choice' && question.options && (
                  <div className="grid grid-cols-1 gap-2 mb-4">
                    {question.options.map((opt, i) => (
                      <div key={i} className={`
                        p-3 rounded-lg text-sm
                        ${opt === question.correctAnswer ? 'bg-green-100 text-green-800 font-semibold border border-green-200' : ''}
                        ${!isCorrect && opt === userAnswer ? 'bg-red-100 text-red-800 line-through border border-red-200' : 'bg-gray-50'}
                      `}>
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {/* O/X 표시 */}
                {question.type === 'true-false' && (
                  <div className="flex gap-4 mb-4">
                    <div className={`px-4 py-2 rounded-lg ${question.correctAnswer === true ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-100'}`}>O</div>
                    <div className={`px-4 py-2 rounded-lg ${question.correctAnswer === false ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-100'}`}>X</div>
                    {!isCorrect && (
                      <span className="text-red-500 text-sm flex items-center">
                        (당신의 답: {userAnswer ? 'O' : 'X'})
                      </span>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm font-bold text-blue-800 mb-1">💡 해설</p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

