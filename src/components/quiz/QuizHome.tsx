import React, { useState, useEffect } from 'react'
import { extractTextFromZip, generateQuizFromMaterials } from '../../services/quiz'
import { getQuizMaterials, createQuizMaterial, deleteQuizMaterial } from '../../services/materials'
import { QuizSet, QuizMaterial } from '../../types/quiz'
import { getCurrentUser } from '../../services/auth'
import { getCurrentUserProfile } from '../../services/userManagement'

interface QuizHomeProps {
  onQuizGenerated: (quizSet: QuizSet) => void
}

export default function QuizHome({ onQuizGenerated }: QuizHomeProps) {
  const [materials, setMaterials] = useState<QuizMaterial[]>([])
  const [userIsAdmin, setUserIsAdmin] = useState(false) // DB 기반 관리자 상태
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false) // 퀴즈 생성 중 상태
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

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

    // 파일 크기 검증 (10MB 제한)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError(`파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
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

  const handleStartQuiz = async (material: QuizMaterial) => {
    setGenerating(true)
    setError(null)
    try {
      const quizSet = await generateQuizFromMaterials(material.content)
      onQuizGenerated(quizSet)
    } catch (err) {
      console.error(err)
      setError('퀴즈 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
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
              onClick={() => handleStartQuiz(material)}
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
                  <button
                    onClick={(e) => handleDelete(material.id, e)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                    title="삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                {material.description || '설명 없음'}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>{new Date(material.created_at).toLocaleDateString()}</span>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full font-medium group-hover:bg-purple-100 transition-colors">
                  시험 보기 →
                </span>
              </div>
            </div>
          ))
        )}
      </div>

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
                  <span className="text-xs text-gray-400">(.txt, .md, .pptx 포함 가능)</span>
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
