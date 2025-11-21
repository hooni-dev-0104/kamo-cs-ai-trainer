import { AppStep } from '../types'

interface ProgressTrackerProps {
  currentStep: AppStep
}

const steps: { key: AppStep; label: string }[] = [
  { key: 'scenario-selection', label: '시나리오 선택' },
  { key: 'listening', label: '고객 음성 듣기' },
  { key: 'recording', label: '응대 녹음' },
  { key: 'transcribing', label: '음성 인식' },
  { key: 'generating-response', label: '고객 응답 생성' },
  { key: 'analyzing', label: '분석 중' },
  { key: 'feedback', label: '피드백' },
]

export default function ProgressTracker({ currentStep }: ProgressTrackerProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex
          const isUpcoming = index > currentIndex

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <p
                  className={`mt-2 text-xs text-center ${
                    isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

