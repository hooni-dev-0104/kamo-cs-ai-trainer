import { useState, useEffect, useRef } from 'react'
import { QuizSet, QuizResult, QuizMaterial } from '../../types/quiz'

interface QuizSolverProps {
  quizSet: QuizSet
  material?: QuizMaterial
  onComplete: (result: QuizResult) => void
}

export default function QuizSolver({ quizSet, material, onComplete }: QuizSolverProps) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string | boolean>>({})
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    material?.time_limit ? material.time_limit * 60 : null // 분을 초로 변환
  )
  const [oneMinuteWarningShown, setOneMinuteWarningShown] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const questions = quizSet.questions
  const currentQuestion = questions[currentQuestionIdx]
  const isLastQuestion = currentQuestionIdx === questions.length - 1

  // 타이머 효과
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) return 0
        
        const newTime = prev - 1
        
        // 1분 전 알림 (정확히 60초일 때)
        if (newTime === 60 && !oneMinuteWarningShown) {
          setOneMinuteWarningShown(true)
          alert('⏰ 남은 시간이 1분입니다!')
        }
        
        // 시간 종료
        if (newTime <= 0) {
          handleTimeUp()
          return 0
        }
        
        return newTime
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timeRemaining, oneMinuteWarningShown])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleAnswer = (answer: string | boolean) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    // 답변하지 않은 문제 수 계산
    const unansweredCount = questions.length - Object.keys(userAnswers).length
    
    if (unansweredCount > 0) {
      alert(`⏰ 시간이 종료되었습니다.\n\n답변하지 않은 ${unansweredCount}문항은 오답으로 처리되며 자동 제출됩니다.`)
    } else {
      alert('⏰ 시간이 종료되었습니다. 자동으로 제출됩니다.')
    }
    
    handleSubmit()
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmitClick = () => {
    // 답변하지 않은 문제 수 확인
    const unansweredCount = questions.length - Object.keys(userAnswers).length
    
    if (unansweredCount > 0) {
      const confirmed = confirm(
        `아직 ${unansweredCount}문항에 답변하지 않았습니다.\n\n답변하지 않은 문제는 오답으로 처리됩니다.\n정말 제출하시겠습니까?`
      )
      if (!confirmed) return
    }
    
    handleSubmit()
  }

  const handleSubmit = () => {
    // 타이머 정리
    if (timerRef.current) clearInterval(timerRef.current)
    
    // 채점 로직
    let correctCount = 0
    const wrongQuestions: number[] = []

    questions.forEach(q => {
      // 답변한 문제 중 정답인 경우
      if (userAnswers[q.id] !== undefined && userAnswers[q.id] === q.correctAnswer) {
        correctCount++
      } else {
        // 답변하지 않았거나 오답인 경우 모두 오답 처리
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
          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <span 
                className={`text-sm font-bold px-3 py-1 rounded-full ${
                  timeRemaining <= 60 
                    ? 'text-red-600 bg-red-100 animate-pulse' 
                    : timeRemaining <= 180 
                    ? 'text-orange-600 bg-orange-100' 
                    : 'text-blue-600 bg-blue-100'
                }`}
              >
                ⏱️ {formatTime(timeRemaining)}
              </span>
            )}
            <span className="text-sm text-gray-500">
              {currentQuestion.type === 'multiple-choice' ? '객관식' : 'O/X 퀴즈'}
            </span>
          </div>
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
            onClick={handleSubmitClick}
            className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold shadow-md hover:bg-green-600 transition-colors"
          >
            제출하기
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

