import { useState } from 'react'
import { QuizSet, QuizResult } from '../../types/quiz'

interface QuizSolverProps {
  quizSet: QuizSet
  onComplete: (result: QuizResult) => void
}

export default function QuizSolver({ quizSet, onComplete }: QuizSolverProps) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string | boolean>>({})
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)

  const questions = quizSet.questions
  const currentQuestion = questions[currentQuestionIdx]
  const isLastQuestion = currentQuestionIdx === questions.length - 1

  const handleAnswer = (answer: string | boolean) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  const handleSubmit = () => {
    // 채점 로직
    let correctCount = 0
    const wrongQuestions: number[] = []

    questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correctCount++
      } else {
        wrongQuestions.push(q.id)
      }
    })

    const score = Math.round((correctCount / questions.length) * 100)

    onComplete({
      totalQuestions: questions.length,
      correctCount,
      score,
      wrongQuestions,
      userAnswers
    })
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
            문제 {currentQuestionIdx + 1} / {questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {currentQuestion.type === 'multiple-choice' ? '객관식' : 'O/X 퀴즈'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* 문제 */}
      <div className="bg-white p-8 rounded-2xl shadow-md mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 leading-relaxed">
          Q. {currentQuestion.question}
        </h3>

        {/* 객관식 보기 */}
        {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  userAnswers[currentQuestion.id] === option
                    ? 'border-purple-500 bg-purple-50 text-purple-900 font-semibold'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="inline-block w-6 h-6 rounded-full border border-current text-center leading-5 mr-3 text-sm">
                  {idx + 1}
                </span>
                {option}
              </button>
            ))}
          </div>
        )}

        {/* O/X 보기 */}
        {currentQuestion.type === 'true-false' && (
          <div className="flex gap-4">
            <button
              onClick={() => handleAnswer(true)}
              className={`flex-1 p-8 rounded-xl border-2 text-center transition-all ${
                userAnswers[currentQuestion.id] === true
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-5xl font-bold">O</span>
              <p className="mt-2 font-semibold">그렇다</p>
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className={`flex-1 p-8 rounded-xl border-2 text-center transition-all ${
                userAnswers[currentQuestion.id] === false
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-5xl font-bold">X</span>
              <p className="mt-2 font-semibold">아니다</p>
            </button>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIdx === 0}
          className="px-6 py-2 text-gray-600 font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition-colors"
        >
          이전 문제
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(userAnswers).length < questions.length}
            className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold shadow-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            제출 및 채점하기
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={userAnswers[currentQuestion.id] === undefined}
            className="px-8 py-3 bg-purple-500 text-white rounded-lg font-bold shadow-md hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음 문제
          </button>
        )}
      </div>
    </div>
  )
}

