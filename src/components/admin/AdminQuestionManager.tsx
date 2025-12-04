import { useState, useEffect } from 'react'
import { QuizMaterial, ManualQuizQuestion } from '../../types/quiz'
import { getManualQuestions, createManualQuestion, updateManualQuestion, deleteManualQuestion } from '../../services/manualQuestions'

interface AdminQuestionManagerProps {
  material: QuizMaterial
  onClose: () => void
}

export default function AdminQuestionManager({ material, onClose }: AdminQuestionManagerProps) {
  const [questions, setQuestions] = useState<ManualQuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuestion, setEditingQuestion] = useState<ManualQuizQuestion | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    question_type: 'multiple-choice' as 'multiple-choice' | 'true-false',
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_answer: '',
    explanation: ''
  })

  useEffect(() => {
    loadQuestions()
  }, [material.id])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const data = await getManualQuestions(material.id)
      setQuestions(data)
    } catch (err) {
      console.error('Failed to load questions:', err)
      alert('문제를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    setEditingQuestion(null)
    setFormData({
      question_type: 'multiple-choice',
      question: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_answer: '',
      explanation: ''
    })
  }

  const handleEdit = (question: ManualQuizQuestion) => {
    setIsCreating(false)
    setEditingQuestion(question)
    setFormData({
      question_type: question.question_type,
      question: question.question,
      option1: question.options?.[0] || '',
      option2: question.options?.[1] || '',
      option3: question.options?.[2] || '',
      option4: question.options?.[3] || '',
      correct_answer: question.correct_answer,
      explanation: question.explanation
    })
  }

  const handleSave = async () => {
    try {
      // 유효성 검사
      if (!formData.question.trim()) {
        alert('문제를 입력해주세요.')
        return
      }

      if (formData.question_type === 'multiple-choice') {
        if (!formData.option1.trim() || !formData.option2.trim() || 
            !formData.option3.trim() || !formData.option4.trim()) {
          alert('모든 보기를 입력해주세요.')
          return
        }
        const options = [formData.option1, formData.option2, formData.option3, formData.option4]
        if (!options.includes(formData.correct_answer)) {
          alert('정답은 보기 중 하나여야 합니다.')
          return
        }
      } else {
        if (!['true', 'false'].includes(formData.correct_answer)) {
          alert('O/X 문제의 정답은 true 또는 false여야 합니다.')
          return
        }
      }

      if (!formData.explanation.trim()) {
        alert('해설을 입력해주세요.')
        return
      }

      const questionData = {
        material_id: material.id,
        question_type: formData.question_type,
        question: formData.question.trim(),
        options: formData.question_type === 'multiple-choice' 
          ? [formData.option1, formData.option2, formData.option3, formData.option4]
          : undefined,
        correct_answer: formData.correct_answer,
        explanation: formData.explanation.trim(),
        order_index: isCreating ? questions.length : editingQuestion?.order_index || 0,
        is_active: true
      }

      if (isCreating) {
        await createManualQuestion(questionData)
      } else if (editingQuestion) {
        await updateManualQuestion(editingQuestion.id, questionData)
      }

      await loadQuestions()
      setIsCreating(false)
      setEditingQuestion(null)
      alert('문제가 저장되었습니다.')
    } catch (err) {
      alert(err instanceof Error ? err.message : '문제 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('정말 이 문제를 삭제하시겠습니까?')) return

    try {
      await deleteManualQuestion(questionId)
      await loadQuestions()
    } catch (err) {
      alert(err instanceof Error ? err.message : '문제 삭제에 실패했습니다.')
    }
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingQuestion(null)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>문제를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">문제 관리</h2>
              <p className="text-gray-600 mt-1">{material.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 문제 목록 */}
          {!isCreating && !editingQuestion && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">등록된 문제 ({questions.length}개)</h3>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  + 새 문제 추가
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">등록된 문제가 없습니다.</p>
                  <p className="text-sm text-gray-400 mt-2">위의 "새 문제 추가" 버튼을 눌러 문제를 작성하세요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-blue-600">문제 {idx + 1}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              q.question_type === 'multiple-choice' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {q.question_type === 'multiple-choice' ? '객관식' : 'O/X'}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                          
                          {q.question_type === 'multiple-choice' && q.options && (
                            <div className="ml-4 space-y-1 mb-2">
                              {q.options.map((opt, i) => (
                                <div key={i} className={`text-sm ${opt === q.correct_answer ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                                  {i + 1}. {opt} {opt === q.correct_answer && '✓'}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {q.question_type === 'true-false' && (
                            <div className="ml-4 mb-2">
                              <span className="text-sm font-semibold text-green-600">
                                정답: {q.correct_answer === 'true' ? 'O (맞음)' : 'X (틀림)'}
                              </span>
                            </div>
                          )}

                          <details className="ml-4 text-sm text-gray-600">
                            <summary className="cursor-pointer hover:text-gray-900">해설 보기</summary>
                            <p className="mt-2 p-2 bg-white rounded border">{q.explanation}</p>
                          </details>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(q)}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 문제 작성/수정 폼 */}
          {(isCreating || editingQuestion) && (
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-4">
                {isCreating ? '새 문제 추가' : '문제 수정'}
              </h3>

              <div className="space-y-4">
                {/* 문제 유형 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    문제 유형 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="question_type"
                        value="multiple-choice"
                        checked={formData.question_type === 'multiple-choice'}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          question_type: e.target.value as 'multiple-choice',
                          correct_answer: '' 
                        }))}
                        className="mr-2"
                      />
                      <span>객관식 (4지선다)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="question_type"
                        value="true-false"
                        checked={formData.question_type === 'true-false'}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          question_type: e.target.value as 'true-false',
                          correct_answer: 'true'
                        }))}
                        className="mr-2"
                      />
                      <span>O/X</span>
                    </label>
                  </div>
                </div>

                {/* 문제 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    문제 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.question}
                    onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="문제를 입력하세요"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {/* 객관식 보기 */}
                {formData.question_type === 'multiple-choice' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        보기 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.option1}
                        onChange={(e) => setFormData(prev => ({ ...prev, option1: e.target.value }))}
                        placeholder="첫 번째 보기"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        보기 2 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.option2}
                        onChange={(e) => setFormData(prev => ({ ...prev, option2: e.target.value }))}
                        placeholder="두 번째 보기"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        보기 3 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.option3}
                        onChange={(e) => setFormData(prev => ({ ...prev, option3: e.target.value }))}
                        placeholder="세 번째 보기"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        보기 4 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.option4}
                        onChange={(e) => setFormData(prev => ({ ...prev, option4: e.target.value }))}
                        placeholder="네 번째 보기"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* 정답 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    정답 <span className="text-red-500">*</span>
                  </label>
                  {formData.question_type === 'multiple-choice' ? (
                    <select
                      value={formData.correct_answer}
                      onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">정답을 선택하세요</option>
                      {formData.option1 && <option value={formData.option1}>{formData.option1}</option>}
                      {formData.option2 && <option value={formData.option2}>{formData.option2}</option>}
                      {formData.option3 && <option value={formData.option3}>{formData.option3}</option>}
                      {formData.option4 && <option value={formData.option4}>{formData.option4}</option>}
                    </select>
                  ) : (
                    <select
                      value={formData.correct_answer}
                      onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">O (맞음)</option>
                      <option value="false">X (틀림)</option>
                    </select>
                  )}
                </div>

                {/* 해설 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    해설 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="정답에 대한 해설을 입력하세요"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>

                {/* 버튼 */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                  >
                    {isCreating ? '추가' : '수정'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        {!isCreating && !editingQuestion && (
          <div className="p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

