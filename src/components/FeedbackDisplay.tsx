import { Feedback } from '../types'

interface FeedbackDisplayProps {
  feedback: Feedback['feedback_json']
  transcribedText: string
}

export default function FeedbackDisplay({ feedback, transcribedText }: FeedbackDisplayProps) {
  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const scoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">피드백 결과</h2>
        <div className={`inline-block px-6 py-2 rounded-full text-2xl font-bold ${scoreBgColor(feedback.overallScore)} ${scoreColor(feedback.overallScore)}`}>
          종합 점수: {feedback.overallScore}점
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">인식된 응대 내용</h3>
        <div className="p-4 bg-gray-50 rounded-lg border">
          <p className="text-gray-700">{transcribedText || '인식된 텍스트가 없습니다.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">공감 표현</p>
          <p className={`text-2xl font-bold ${scoreColor(feedback.empathy)}`}>
            {feedback.empathy}
          </p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">문제 해결</p>
          <p className={`text-2xl font-bold ${scoreColor(feedback.problemSolving)}`}>
            {feedback.problemSolving}
          </p>
        </div>
        <div className="text-center p-4 bg-indigo-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">전문성</p>
          <p className={`text-2xl font-bold ${scoreColor(feedback.professionalism)}`}>
            {feedback.professionalism}
          </p>
        </div>
        <div className="text-center p-4 bg-pink-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">톤</p>
          <p className={`text-2xl font-bold ${scoreColor(feedback.tone)}`}>
            {feedback.tone}
          </p>
        </div>
      </div>

      {feedback.strengths.length > 0 && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800 flex items-center gap-2">
            <span className="text-xl">✨</span>
            잘한 점
          </h3>
          <ul className="space-y-2">
            {feedback.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-800">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span className="flex-1">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-orange-800 flex items-center gap-2">
            <span className="text-xl">💡</span>
            개선 제안 (Action Items)
          </h3>
          <ul className="space-y-2">
            {feedback.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-800">
                <span className="text-orange-500 font-bold mt-1">•</span>
                <span className="flex-1">{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.detailedFeedback && (
        <div>
          <h3 className="text-lg font-semibold mb-2">상세 피드백</h3>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-gray-700 whitespace-pre-wrap">{feedback.detailedFeedback}</p>
          </div>
        </div>
      )}
    </div>
  )
}

