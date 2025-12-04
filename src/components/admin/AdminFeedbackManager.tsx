import { useState, useEffect } from 'react'
import { getAllQuizFeedbacks, updateQuizFeedback } from '../../services/quizFeedback'
import { QuizFeedback } from '../../types/quiz'
import { supabase } from '../../services/supabase'

export default function AdminFeedbackManager() {
  const [feedbacks, setFeedbacks] = useState<QuizFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingFeedback, setEditingFeedback] = useState<{ id: string; text: string } | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'sent' | 'read'>('all')

  useEffect(() => {
    loadFeedbacks()
  }, [filterStatus])

  const loadFeedbacks = async () => {
    setLoading(true)
    setError(null)
    try {
      const allFeedbacks = await getAllQuizFeedbacks()
      const filtered = filterStatus === 'all' 
        ? allFeedbacks 
        : allFeedbacks.filter(f => f.status === filterStatus)
      setFeedbacks(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : '피드백을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditFeedback = (feedback: QuizFeedback) => {
    setEditingFeedback({
      id: feedback.id,
      text: feedback.feedback_text,
    })
  }

  const handleSaveFeedback = async () => {
    if (!editingFeedback) return

    try {
      await updateQuizFeedback(editingFeedback.id, {
        feedback_text: editingFeedback.text,
      })
      await loadFeedbacks()
      setEditingFeedback(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '피드백 저장에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">피드백을 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        {error}
        <button
          onClick={loadFeedbacks}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">상태 필터:</span>
          <div className="flex gap-2">
            {(['all', 'pending', 'sent', 'read'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status === 'all' ? '전체' : 
                 status === 'pending' ? '대기' :
                 status === 'sent' ? '전송됨' : '읽음'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 피드백 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">피드백 관리</h2>
          <p className="text-gray-600 mt-1">재교육 대상자에게 제공할 피드백을 관리하세요.</p>
        </div>

        {feedbacks.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            피드백이 없습니다.
          </div>
        ) : (
          <div className="divide-y">
            {feedbacks.map((feedback) => (
              <FeedbackItem
                key={feedback.id}
                feedback={feedback}
                editingFeedback={editingFeedback}
                onEdit={handleEditFeedback}
                onSave={handleSaveFeedback}
                onCancel={() => setEditingFeedback(null)}
                onTextChange={(text) => {
                  if (editingFeedback?.id === feedback.id) {
                    setEditingFeedback({ ...editingFeedback, text })
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface FeedbackItemProps {
  feedback: QuizFeedback
  editingFeedback: { id: string; text: string } | null
  onEdit: (feedback: QuizFeedback) => void
  onSave: () => void
  onCancel: () => void
  onTextChange: (text: string) => void
}

function FeedbackItem({
  feedback,
  editingFeedback,
  onEdit,
  onSave,
  onCancel,
  onTextChange,
}: FeedbackItemProps) {
  const [userEmail, setUserEmail] = useState<string>('로딩 중...')
  const [materialTitle, setMaterialTitle] = useState<string>('로딩 중...')
  const isEditing = editingFeedback?.id === feedback.id

  useEffect(() => {
    // 사용자 이메일 가져오기
    supabase
      .from('profiles')
      .select('email')
      .eq('id', feedback.user_id)
      .single()
      .then(({ data }) => {
        setUserEmail(data?.email || '알 수 없음')
      })

    // 학습 자료 제목 가져오기
    supabase
      .from('quiz_materials')
      .select('title')
      .eq('id', feedback.material_id)
      .single()
      .then(({ data }) => {
        setMaterialTitle(data?.title || '알 수 없음')
      })
  }, [feedback.user_id, feedback.material_id])

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-900">{userEmail}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-600">{materialTitle}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              feedback.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              feedback.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {feedback.status === 'pending' ? '대기' :
               feedback.status === 'sent' ? '전송됨' : '읽음'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            생성일: {new Date(feedback.created_at).toLocaleString('ko-KR')}
            {feedback.email_sent_at && (
              <> • 전송일: {new Date(feedback.email_sent_at).toLocaleString('ko-KR')}</>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <button
              onClick={() => onEdit(feedback)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              수정
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={onSave}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                저장
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
            </>
          )}
        </div>
      </div>

      {/* 피드백 내용 */}
      {isEditing ? (
        <div>
          <textarea
            value={editingFeedback.text}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={6}
            placeholder="피드백 내용을 입력하세요..."
          />
          {/* AI 추천 피드백 참고 */}
          {feedback.ai_recommended_feedback && (
            <div className="mt-2 text-xs text-gray-600">
              💡 팁: 아래 "AI 추천 피드백"을 참고하여 수정할 수 있습니다.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-3 border border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-indigo-900">💬 피드백 내용</span>
          </div>
          <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{feedback.feedback_text}</p>
        </div>
      )}

      {/* AI 추천 피드백 (참고용 - 접기/펼치기) */}
      {!isEditing && feedback.ai_recommended_feedback && feedback.ai_recommended_feedback !== feedback.feedback_text && (
        <details className="mt-3">
          <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 font-medium">
            🤖 AI 추천 피드백 보기 (참고용)
          </summary>
          <div className="mt-2 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{feedback.ai_recommended_feedback}</p>
            <button
              onClick={() => {
                if (confirm('현재 피드백을 AI 추천 내용으로 교체하시겠습니까?')) {
                  onTextChange(feedback.ai_recommended_feedback || '')
                  onEdit(feedback)
                }
              }}
              className="mt-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              이 내용으로 교체
            </button>
          </div>
        </details>
      )}

      {/* 취약 영역 분석 */}
      {feedback.weak_areas && feedback.weak_areas.details && feedback.weak_areas.details.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">취약 영역 분석:</h4>
          <div className="flex flex-wrap gap-2">
            {feedback.weak_areas.details.map((area, idx) => (
              <div key={idx} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center gap-2">
                {area.area}
                {area.priority && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    area.priority === 'high' ? 'bg-red-200' :
                    area.priority === 'medium' ? 'bg-orange-200' :
                    'bg-gray-200'
                  }`}>
                    {area.priority === 'high' ? '높음' : area.priority === 'medium' ? '중간' : '낮음'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 틀린 문제 상세 분석 */}
      {feedback.wrong_question_analysis && feedback.wrong_question_analysis.length > 0 && (
        <details className="mt-3">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 font-medium">
            틀린 문제 상세 분석 ({feedback.wrong_question_analysis.length}개 문제) 보기
          </summary>
          <div className="mt-3 space-y-2">
            {feedback.wrong_question_analysis.map((analysis, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border-l-4 border-indigo-400 shadow-sm">
                <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  문제 {analysis.questionId}: {analysis.questionText}
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex gap-3">
                    <span className="text-red-600 font-bold min-w-[50px]">오답:</span>
                    <span className="text-gray-800 flex-1">{String(analysis.userAnswer)}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-green-600 font-bold min-w-[50px]">정답:</span>
                    <span className="text-gray-800 flex-1">{String(analysis.correctAnswer)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="mb-2">
                      <span className="text-red-700 font-bold block mb-1">❌ 오답 분석:</span>
                      <p className="text-gray-700 leading-relaxed pl-4">{analysis.whyWrong}</p>
                    </div>
                    <div className="mb-2">
                      <span className="text-blue-700 font-bold block mb-1">📚 핵심 개념:</span>
                      <p className="text-gray-700 leading-relaxed pl-4">{analysis.keyConceptExplanation}</p>
                    </div>
                    <div>
                      <span className="text-green-700 font-bold block mb-1">💡 학습 팁:</span>
                      <p className="text-gray-700 leading-relaxed pl-4">{analysis.learningTip}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 전체 학습 권장사항 */}
      {feedback.overall_recommendation && (
        <details className="mt-3">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 font-medium">
            전체 학습 권장사항 보기
          </summary>
          <div className="mt-2 bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.overall_recommendation}</p>
          </div>
        </details>
      )}
    </div>
  )
}

