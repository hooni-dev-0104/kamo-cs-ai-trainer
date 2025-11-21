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
        <div>
          <h3 className="text-lg font-semibold mb-2 text-green-700">강점</h3>
          <ul className="list-disc list-inside space-y-1">
            {feedback.strengths.map((strength, index) => (
              <li key={index} className="text-gray-700">{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-orange-700">개선점</h3>
          <ul className="list-disc list-inside space-y-1">
            {feedback.improvements.map((improvement, index) => (
              <li key={index} className="text-gray-700">{improvement}</li>
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

