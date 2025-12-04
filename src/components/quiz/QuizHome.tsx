import React, { useState, useEffect } from 'react'
import { extractTextFromZip } from '../../services/quiz'
import { getQuizMaterials, createQuizMaterial, deleteQuizMaterial, updateTimeLimit, updateQuizSettings } from '../../services/materials'
import { QuizSet, QuizMaterial, QuizDifficulty } from '../../types/quiz'
import { getCurrentUser } from '../../services/auth'
import { getCurrentUserProfile } from '../../services/userManagement'
import AdminQuestionManager from '../admin/AdminQuestionManager'
import { generateQuizByMode } from '../../services/quizMode'

interface QuizHomeProps {
  onQuizGenerated: (quizSet: QuizSet, materialId: string, difficulty: QuizDifficulty) => void
}

export default function QuizHome({ onQuizGenerated }: QuizHomeProps) {
  const [materials, setMaterials] = useState<QuizMaterial[]>([])
  const [userIsAdmin, setUserIsAdmin] = useState(false) // DB 기반 관리자 상태
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false) // 퀴즈 생성 중 상태
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<QuizMaterial | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty>('medium')
  const [editingTimeLimit, setEditingTimeLimit] = useState<{ materialId: string; value: string } | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [currentUserInfo, setCurrentUserInfo] = useState<{ name: string; email: string; department: string } | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState<QuizMaterial | null>(null)
  const [showQuestionManager, setShowQuestionManager] = useState<QuizMaterial | null>(null)
  const [quizSettings, setQuizSettings] = useState<{
    total_questions: number
    multiple_choice_count: number
    true_false_count: number
    required_topics: string
    quiz_mode: 'ai' | 'manual' | 'both'
    ai_prompt: string
  }>({
    total_questions: 10,
    multiple_choice_count: 5,
    true_false_count: 5,
    required_topics: '',
    quiz_mode: 'ai',
    ai_prompt: ''
  })

  useEffect(() => {
    loadData()
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        const profile = await getCurrentUserProfile()
        setCurrentUserInfo({
          name: currentUser.user_metadata?.name || '알 수 없음',
          email: currentUser.email || '알 수 없음',
          department: getDepartmentLabel(profile?.department || ''),
        })
      }
    } catch (err) {
      console.error('Failed to load user info:', err)
    }
  }

  const getDepartmentLabel = (department: string): string => {
    switch (department) {
      case 'kmcc_yongsan': return 'KMCC 용산'
      case 'kmcc_gwangju': return 'KMCC 광주'
      case 'km_crew': return 'KM 크루'
      default: return '미지정'
    }
  }

  const loadData = async () => {
    try {
      const [fetchedMaterials, currentUser] = await Promise.all([
        getQuizMaterials(),
        getCurrentUser()
      ])
      setMaterials(fetchedMaterials)

      // DB 기반 관리자 권한 확인
      if (currentUser) {
        try {
          const profile = await getCurrentUserProfile()
          setUserIsAdmin(profile?.role === 'admin')
        } catch (err) {
          console.error('Failed to check admin status:', err)
          setUserIsAdmin(false)
        }
      }
    } catch (err) {
      console.error(err)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    // 파일 형식 검증
    if (!file.name.endsWith('.zip')) {
      setError('Zip 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 검증 (1GB 제한)
    const maxSize = 1024 * 1024 * 1024 // 1GB
    if (file.size > maxSize) {
      const sizeInGB = (file.size / 1024 / 1024 / 1024).toFixed(2)
      setError(`파일 크기가 너무 큽니다. 최대 1GB까지 업로드 가능합니다. (현재: ${sizeInGB}GB)`)
      return
    }

    // 빈 파일 검증
    if (file.size === 0) {
      setError('빈 파일은 업로드할 수 없습니다.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // 1. 텍스트 추출
      const text = await extractTextFromZip(file)
      
      // 추출된 텍스트 검증
      if (!text || text.trim().length === 0) {
        setError('파일에서 텍스트를 추출할 수 없습니다. 텍스트 파일(.txt, .md)이나 파워포인트(.pptx) 파일이 포함되어 있는지 확인해주세요.')
        return
      }
      
      // 2. DB에 저장 (제목은 파일명)
      const title = file.name.replace('.zip', '').trim()
      if (!title || title.length === 0) {
        setError('파일명이 올바르지 않습니다.')
        return
      }
      
      await createQuizMaterial(title, text, '관리자 업로드 자료')
      
      // 3. 목록 갱신
      const newMaterials = await getQuizMaterials()
      setMaterials(newMaterials)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '자료 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleMaterialClick = (material: QuizMaterial) => {
    setSelectedMaterial(material)
  }

  const handleDifficultyConfirm = () => {
    setShowPreviewModal(true)
  }

  const handleStartQuiz = async () => {
    if (!selectedMaterial) return

    setShowPreviewModal(false)
    setGenerating(true)
    setError(null)
    try {
      // 모드에 따라 퀴즈 생성
      const quizSet = await generateQuizByMode(selectedMaterial, selectedDifficulty)
      quizSet.materialId = selectedMaterial.id
      quizSet.difficulty = selectedDifficulty
      onQuizGenerated(quizSet, selectedMaterial.id, selectedDifficulty)
      setSelectedMaterial(null) // 초기화
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '퀴즈 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const handleTimeLimitSave = async (materialId: string) => {
    if (!editingTimeLimit) return

    try {
      const value = editingTimeLimit.value.trim()
      const timeLimit = value === '' ? null : parseInt(value)
      
      if (timeLimit !== null && (isNaN(timeLimit) || timeLimit < 1 || timeLimit > 300)) {
        alert('제한시간은 1-300분 사이로 설정해주세요.')
        return
      }

      await updateTimeLimit(materialId, timeLimit)
      const updatedMaterials = await getQuizMaterials()
      setMaterials(updatedMaterials)
      setEditingTimeLimit(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '제한시간 설정에 실패했습니다.')
    }
  }

  const handleOpenSettings = (material: QuizMaterial, e: React.MouseEvent) => {
    e.stopPropagation()
    setShowSettingsModal(material)
    setQuizSettings({
      total_questions: material.total_questions || 10,
      multiple_choice_count: material.multiple_choice_count || 5,
      true_false_count: material.true_false_count || 5,
      required_topics: material.required_topics?.join(', ') || '',
      quiz_mode: material.quiz_mode || 'ai',
      ai_prompt: material.ai_prompt || ''
    })
  }

  const handleSaveSettings = async () => {
    if (!showSettingsModal) return

    try {
      const topics = quizSettings.required_topics
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      await updateQuizSettings(showSettingsModal.id, {
        total_questions: quizSettings.total_questions,
        multiple_choice_count: quizSettings.multiple_choice_count,
        true_false_count: quizSettings.true_false_count,
        required_topics: topics,
        quiz_mode: quizSettings.quiz_mode,
        ai_prompt: quizSettings.ai_prompt.trim() || null
      })

      const updatedMaterials = await getQuizMaterials()
      setMaterials(updatedMaterials)
      setShowSettingsModal(null)
      alert('시험 설정이 저장되었습니다.')
    } catch (err) {
      alert(err instanceof Error ? err.message : '설정 저장에 실패했습니다.')
    }
  }
  
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('정말 이 자료를 삭제하시겠습니까?')) return
    try {
      await deleteQuizMaterial(id)
      setMaterials(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setError('자료 삭제에 실패했습니다.')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0])
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-600">학습 자료를 불러오는 중...</p>
      </div>
    )
  }

  if (generating) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
        <p className="text-xl font-semibold text-gray-700">AI가 시험 문제를 출제하고 있습니다...</p>
        <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">AI 이론 평가</h2>
        <p className="text-gray-600">
          등록된 학습 자료를 선택하여 시험을 응시하세요.<br/>
          AI가 자료 내용을 분석하여 문제를 출제합니다.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center animate-pulse">
          ⚠️ {error}
        </div>
      )}

      {/* 자료 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {materials.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-gray-500">등록된 학습 자료가 없습니다.</p>
            {userIsAdmin && <p className="text-sm text-gray-400 mt-2">아래에서 자료를 업로드해주세요.</p>}
          </div>
        ) : (
          materials.map((material) => (
            <div 
              key={material.id}
              onClick={() => handleMaterialClick(material)}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-purple-300 group relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">
                    📚
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 group-hover:text-purple-700 transition-colors line-clamp-1">
                    {material.title}
                  </h3>
                </div>
                {userIsAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleOpenSettings(material, e)}
                      className="text-gray-400 hover:text-blue-500 p-1 rounded-full hover:bg-blue-50 transition-colors"
                      title="시험 설정"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(material.id, e)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                {material.description || '설명 없음'}
              </p>
              
              {/* 제한시간 표시/편집 */}
              {userIsAdmin && (
                <div className="mb-3 pb-3 border-b border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">⏱️ 제한시간:</span>
                    {editingTimeLimit?.materialId === material.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="300"
                          value={editingTimeLimit.value}
                          onChange={(e) => setEditingTimeLimit({ materialId: material.id, value: e.target.value })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="분"
                        />
                        <button
                          onClick={() => handleTimeLimitSave(material.id)}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingTimeLimit(null)}
                          className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingTimeLimit({ 
                          materialId: material.id, 
                          value: material.time_limit?.toString() || '' 
                        })}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {material.time_limit ? `${material.time_limit}분` : '없음'} ✏️
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {!userIsAdmin && material.time_limit && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600">⏱️ 제한시간: {material.time_limit}분</span>
                </div>
              )}

              {/* 관리자: 문제 관리 버튼 (manual 또는 both 모드일 때) */}
              {userIsAdmin && (material.quiz_mode === 'manual' || material.quiz_mode === 'both') && (
                <div className="mb-3 pb-3 border-b border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowQuestionManager(material)
                    }}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                  >
                    📝 문제 관리
                  </button>
                </div>
              )}
              
              <div className="flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span>{new Date(material.created_at).toLocaleDateString()}</span>
                  {material.quiz_mode && material.quiz_mode !== 'ai' && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      material.quiz_mode === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {material.quiz_mode === 'manual' ? '직접출제' : '혼합'}
                    </span>
                  )}
                </div>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full font-medium group-hover:bg-purple-100 transition-colors">
                  시험 보기 →
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 난이도 선택 모달 */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">시험 난이도 선택</h3>
            <p className="text-gray-600 mb-6">
              <span className="font-semibold">{selectedMaterial.title}</span> 시험의 난이도를 선택해주세요.
            </p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedDifficulty('easy')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedDifficulty === 'easy'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">쉬움 (Easy)</div>
                <div className="text-sm text-gray-600">기본적인 내용을 묻는 문제입니다.</div>
              </button>
              
              <button
                onClick={() => setSelectedDifficulty('medium')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedDifficulty === 'medium'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">보통 (Medium)</div>
                <div className="text-sm text-gray-600">학습 자료를 꼼꼼히 읽었다면 풀 수 있는 수준입니다.</div>
              </button>
              
              <button
                onClick={() => setSelectedDifficulty('hard')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedDifficulty === 'hard'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">어려움 (Hard)</div>
                <div className="text-sm text-gray-600">깊이 이해하고 응용할 수 있어야 풀 수 있는 문제입니다.</div>
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMaterial(null)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleDifficultyConfirm}
                className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시험 안내사항 및 응시자 정보 확인 모달 */}
      {showPreviewModal && selectedMaterial && currentUserInfo && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">시험 안내사항</h3>
            
            {/* 응시자 정보 */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">👤</span> 응시자 정보
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">이름:</span>
                  <span className="font-medium text-gray-900">{currentUserInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">이메일:</span>
                  <span className="font-medium text-gray-900">{currentUserInfo.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">소속:</span>
                  <span className="font-medium text-gray-900">{currentUserInfo.department}</span>
                </div>
              </div>
            </div>

            {/* 시험 정보 */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-purple-600">📝</span> 시험 정보
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">시험명:</span>
                  <span className="font-medium text-gray-900">{selectedMaterial.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">출제 방식:</span>
                  <span className="font-medium text-gray-900">
                    {selectedMaterial.quiz_mode === 'manual' ? '직접 출제' : 
                     selectedMaterial.quiz_mode === 'both' ? '혼합 (AI + 직접)' : 'AI 자동 출제'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">난이도:</span>
                  <span className={`font-medium ${
                    selectedDifficulty === 'easy' ? 'text-green-600' :
                    selectedDifficulty === 'medium' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {selectedDifficulty === 'easy' ? '쉬움' : 
                     selectedDifficulty === 'medium' ? '보통' : '어려움'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">문항 수:</span>
                  <span className="font-medium text-gray-900">총 {selectedMaterial.total_questions || 10}문항</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">문제 유형:</span>
                  <span className="font-medium text-gray-900">
                    객관식 {selectedMaterial.multiple_choice_count || 5}문항 + O/X {selectedMaterial.true_false_count || 5}문항
                  </span>
                </div>
                {selectedMaterial.required_topics && selectedMaterial.required_topics.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">필수 영역:</span>
                    <span className="font-medium text-gray-900">{selectedMaterial.required_topics.join(', ')}</span>
                  </div>
                )}
                {selectedMaterial.time_limit && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">제한시간:</span>
                    <span className="font-medium text-red-600">⏱️ {selectedMaterial.time_limit}분</span>
                  </div>
                )}
                {!selectedMaterial.time_limit && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">제한시간:</span>
                    <span className="font-medium text-gray-900">제한 없음</span>
                  </div>
                )}
              </div>
            </div>

            {/* 시험 내용 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-gray-600">📚</span> 시험 내용
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-6">
                {selectedMaterial.content.substring(0, 300).trim()}
                {selectedMaterial.content.length > 300 ? '...' : ''}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                * 위 내용을 기반으로 AI가 문제를 자동 출제합니다.
              </p>
            </div>

            {/* 주의사항 */}
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span> 주의사항
              </h4>
              <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                <li>시험 시작 후에는 중도 포기가 불가능합니다.</li>
                {selectedMaterial.time_limit && (
                  <>
                    <li>제한시간 <strong className="text-red-600">{selectedMaterial.time_limit}분</strong>이 지나면 <strong>자동으로 제출</strong>됩니다.</li>
                    <li>남은 시간이 <strong>1분</strong>일 때 알림이 표시됩니다.</li>
                    <li className="text-red-600 font-medium">시간 종료 시 답변하지 않은 문제는 모두 오답으로 처리됩니다.</li>
                  </>
                )}
                <li>각 문제에 답변해야 다음 문제로 넘어갈 수 있습니다.</li>
                <li>마지막 문제까지 풀면 <strong>"제출하기"</strong> 버튼이 표시됩니다.</li>
                <li className="font-medium">답변하지 않은 문제가 있는 경우:</li>
                <ul className="ml-6 mt-1 space-y-1 list-circle">
                  <li>제출 시 경고 메시지가 표시됩니다.</li>
                  <li>확인 후 제출하면 미답변 문제는 <strong className="text-red-600">오답으로 처리</strong>됩니다.</li>
                </ul>
                <li>시험 결과는 제출 즉시 확인할 수 있습니다.</li>
              </ul>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                이전
              </button>
              <button
                onClick={handleStartQuiz}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'AI가 문제 출제 중...' : '시험 시작'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시험 설정 모달 */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">시험 설정</h3>
            
            <div className="space-y-6">
              {/* 출제 모드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  출제 모드 <span className="text-red-500">*</span>
                </label>
                <select
                  value={quizSettings.quiz_mode}
                  onChange={(e) => setQuizSettings(prev => ({ ...prev, quiz_mode: e.target.value as 'ai' | 'manual' | 'both' }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ai">AI 자동 출제</option>
                  <option value="manual">직접 출제 (수동)</option>
                  <option value="both">혼합 (AI + 수동)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {quizSettings.quiz_mode === 'ai' && 'AI가 학습 자료를 분석하여 자동으로 문제를 출제합니다.'}
                  {quizSettings.quiz_mode === 'manual' && '관리자가 직접 작성한 문제로 시험을 구성합니다.'}
                  {quizSettings.quiz_mode === 'both' && 'AI 출제 문제와 직접 작성한 문제를 혼합하여 시험을 구성합니다.'}
                </p>
              </div>

              {/* 문항 수 설정 (AI 또는 혼합 모드일 때만) */}
              {(quizSettings.quiz_mode === 'ai' || quizSettings.quiz_mode === 'both') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      총 문항 수 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={quizSettings.total_questions}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0
                        setQuizSettings(prev => ({ ...prev, total_questions: value }))
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">1-50문항 사이로 설정 가능합니다.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        객관식 문항 수 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={quizSettings.multiple_choice_count}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0
                          const tfCount = quizSettings.total_questions - value
                          setQuizSettings(prev => ({ 
                            ...prev, 
                            multiple_choice_count: value,
                            true_false_count: Math.max(0, tfCount)
                          }))
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        O/X 문항 수 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={quizSettings.true_false_count}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0
                          const mcCount = quizSettings.total_questions - value
                          setQuizSettings(prev => ({ 
                            ...prev, 
                            true_false_count: value,
                            multiple_choice_count: Math.max(0, mcCount)
                          }))
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 -mt-4">
                    객관식 + O/X = {quizSettings.multiple_choice_count + quizSettings.true_false_count}문항
                    {quizSettings.multiple_choice_count + quizSettings.true_false_count !== quizSettings.total_questions && (
                      <span className="text-red-500 ml-2">
                        ⚠️ 총 문항 수와 일치하지 않습니다!
                      </span>
                    )}
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      필수 포함 영역/키워드
                    </label>
                    <input
                      type="text"
                      value={quizSettings.required_topics}
                      onChange={(e) => setQuizSettings(prev => ({ ...prev, required_topics: e.target.value }))}
                      placeholder="예: 알고리즘, 자료구조, 네트워크"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      쉼표(,)로 구분하여 입력하세요. AI가 해당 영역의 문제를 우선적으로 출제합니다.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI 출제 커스텀 프롬프트 (선택사항)
                    </label>
                    <textarea
                      value={quizSettings.ai_prompt}
                      onChange={(e) => setQuizSettings(prev => ({ ...prev, ai_prompt: e.target.value }))}
                      placeholder="예: 실무 상황을 반영한 문제를 출제해주세요. 개념 설명보다는 적용 능력을 평가하는 문제를 중심으로 구성해주세요."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      AI가 문제를 출제할 때 참고할 추가 지침을 입력하세요. 출제 방향, 난이도, 스타일 등을 지정할 수 있습니다.
                    </p>
                  </div>
                </>
              )}

              {/* 수동 모드 안내 */}
              {quizSettings.quiz_mode === 'manual' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>직접 출제 모드:</strong> 이 모드에서는 관리자가 직접 작성한 문제만 사용됩니다.
                    시험 설정을 저장한 후 학습 자료 카드의 "문제 관리" 버튼을 눌러 문제를 추가하세요.
                  </p>
                </div>
              )}

              {/* 혼합 모드 안내 */}
              {quizSettings.quiz_mode === 'both' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>혼합 모드:</strong> AI가 자동 출제한 문제와 직접 작성한 문제를 함께 사용합니다.
                    더 다양하고 균형잡힌 시험을 만들 수 있습니다.
                  </p>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowSettingsModal(null)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={
                  (quizSettings.quiz_mode === 'ai' || quizSettings.quiz_mode === 'both') &&
                  (quizSettings.multiple_choice_count + quizSettings.true_false_count !== quizSettings.total_questions)
                }
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문제 관리 모달 */}
      {showQuestionManager && (
        <AdminQuestionManager
          material={showQuestionManager}
          onClose={() => setShowQuestionManager(null)}
        />
      )}

      {/* 관리자 전용 업로드 영역 */}
      {userIsAdmin && (
        <div className="border-t pt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-sm bg-gray-800 text-white px-2 py-1 rounded">Admin</span>
            새 자료 업로드
          </h3>
          
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }
            `}
          >
            {uploading ? (
              <div className="py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-gray-600">자료를 업로드하고 분석 중입니다...</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  학습 자료(Zip)를 이곳에 드래그하거나 클릭하여 업로드하세요.<br/>
                  <span className="text-xs text-gray-400">(.txt, .md, .pptx 포함 가능, 최대 1GB)</span>
                </p>
                <input
                  type="file"
                  accept=".zip"
                  onChange={onFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer inline-block"
                >
                  파일 선택
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
