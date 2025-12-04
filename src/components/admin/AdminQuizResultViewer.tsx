import { useState, useEffect } from 'react'
import { getUserQuizResults, getAllRecentQuizResults, UserQuizResult, searchUsersByEmail } from '../../services/quizResults'

export default function AdminQuizResultViewer() {
  const [emailQuery, setEmailQuery] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; email: string }>>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [results, setResults] = useState<UserQuizResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'search' | 'recent'>('search')
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null)

  // 최근 결과 자동 로드
  useEffect(() => {
    if (viewMode === 'recent') {
      loadRecentResults()
    }
  }, [viewMode])

  // 이메일 검색 자동완성
  useEffect(() => {
    const searchUsers = async () => {
      if (emailQuery.length >= 2) {
        try {
          console.log('🔍 검색 시작:', emailQuery)
          const users = await searchUsersByEmail(emailQuery)
          console.log('📊 검색 결과:', users.length, '명')
          setSearchSuggestions(users)
          setShowDropdown(true) // 검색 결과가 있든 없든 드롭다운 표시
          
          if (users.length === 0) {
            console.log('⚠️ 검색 결과 없음')
          }
        } catch (err) {
          console.error('❌ 사용자 검색 실패:', err)
          setShowDropdown(false)
        }
      } else {
        setSearchSuggestions([])
        setShowDropdown(false)
      }
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [emailQuery])

  // 자동완성 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.email-search-container')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectUser = (userId: string, email: string) => {
    setSelectedUserId(userId)
    setEmailQuery(email)
    setShowDropdown(false)
  }

  const handleSearch = async () => {
    if (!selectedUserId && !emailQuery) {
      alert('이메일을 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let userId = selectedUserId

      // 이메일로만 입력하고 선택하지 않은 경우, 정확히 일치하는 사용자 찾기
      if (!userId && emailQuery) {
        const users = await searchUsersByEmail(emailQuery)
        const exactMatch = users.find(u => u.email.toLowerCase() === emailQuery.toLowerCase())
        
        if (exactMatch) {
          userId = exactMatch.id
        } else if (users.length === 1) {
          // 검색 결과가 1개면 자동 선택
          userId = users[0].id
        } else if (users.length > 1) {
          setError('여러 사용자가 검색되었습니다. 목록에서 선택해주세요.')
          setShowDropdown(true)
          setLoading(false)
          return
        } else {
          setError('해당 이메일의 사용자를 찾을 수 없습니다.')
          setLoading(false)
          return
        }
      }

      const data = await getUserQuizResults(
        userId,
        startDate || undefined,
        endDate || undefined
      )
      setResults(data)
      
      if (data.length === 0) {
        setError('해당 기간에 시험 결과가 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '시험 결과 조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadRecentResults = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getAllRecentQuizResults(100)
      setResults(data)
      
      if (data.length === 0) {
        setError('최근 시험 결과가 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '시험 결과 조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setEmailQuery('')
    setSelectedUserId('')
    setSearchSuggestions([])
    setShowDropdown(false)
    setStartDate('')
    setEndDate('')
    setResults([])
    setError(null)
  }

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      easy: '쉬움',
      medium: '보통',
      hard: '어려움'
    }
    return labels[difficulty] || difficulty
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200'
    if (score >= 70) return 'bg-blue-50 border-blue-200'
    if (score >= 50) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="space-y-6">
      {/* 조회 모드 선택 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setViewMode('search')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'search'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🔍 사용자 검색
          </button>
          <button
            onClick={() => setViewMode('recent')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'recent'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📋 최근 결과 (전체)
          </button>
        </div>

        {viewMode === 'search' && (
          <>
            <h2 className="text-xl font-bold mb-4">상담사 시험 결과 조회</h2>
            <p className="text-gray-600 mb-6">
              특정 상담사의 ID와 기간을 선택하여 시험 결과를 조회할 수 있습니다.
            </p>

            {/* 검색 폼 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 이메일 검색 */}
              <div className="relative email-search-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상담사 이메일 *
                </label>
                <input
                  type="text"
                  value={emailQuery}
                  onChange={(e) => {
                    setEmailQuery(e.target.value)
                    setSelectedUserId('')
                  }}
                  onFocus={() => {
                    if (emailQuery.length >= 2 && searchSuggestions.length > 0) {
                      setShowDropdown(true)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                      setShowDropdown(false)
                    }
                  }}
                  placeholder="이메일 입력 (예: user@example.com)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                {/* 자동완성 드롭다운 */}
                {showDropdown && emailQuery.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchSuggestions.length > 0 ? (
                      searchSuggestions.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user.id, user.email)}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        "{emailQuery}"와 일치하는 사용자가 없습니다
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  최소 2자 이상 입력하면 자동완성이 표시됩니다 (예: "user" → "user@example.com")
                </p>
              </div>

              {/* 시작 날짜 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시작 날짜
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 종료 날짜 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료 날짜
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 버튼 */}
              <div className="flex items-end gap-2">
                <button
                  onClick={handleSearch}
                  disabled={loading || !emailQuery.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '조회 중...' : '조회'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  초기화
                </button>
              </div>
            </div>
          </>
        )}

        {viewMode === 'recent' && (
          <div>
            <h2 className="text-xl font-bold mb-2">최근 시험 결과 (전체)</h2>
            <p className="text-gray-600">
              모든 사용자의 최근 100개 시험 결과를 보여줍니다.
            </p>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">{error}</p>
        </div>
      )}

      {/* 결과 목록 */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold">
              조회 결과 ({results.length}개)
            </h3>
          </div>
          <div className="divide-y">
            {results.map((result) => (
              <div
                key={result.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {result.material_title}
                      </h4>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {getDifficultyLabel(result.difficulty)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">상담사:</span> {result.user_name}
                      </div>
                      <div>
                        <span className="font-medium">이메일:</span> {result.user_email}
                      </div>
                      <div>
                        <span className="font-medium">응시 일시:</span>{' '}
                        {new Date(result.created_at).toLocaleString('ko-KR')}
                      </div>
                      <div>
                        <span className="font-medium">정답률:</span>{' '}
                        {result.correct_count}/{result.total_questions} (
                        {Math.round((result.correct_count / result.total_questions) * 100)}%)
                      </div>
                    </div>

                    {/* 틀린 문제 상세 보기 */}
                    {result.wrong_questions.length > 0 && (
                      <button
                        onClick={() =>
                          setExpandedResultId(
                            expandedResultId === result.id ? null : result.id
                          )
                        }
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        {expandedResultId === result.id ? '▼' : '▶'} 틀린 문제 보기 (
                        {result.wrong_questions.length}개)
                      </button>
                    )}

                    {expandedResultId === result.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">틀린 문제 번호:</span>{' '}
                          {result.wrong_questions.sort((a, b) => a - b).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 점수 */}
                  <div
                    className={`ml-6 px-6 py-4 rounded-lg border-2 ${getScoreBgColor(
                      result.score
                    )}`}
                  >
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                        {result.score}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">점</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">결과를 조회하는 중...</p>
        </div>
      )}

      {/* 결과 없음 */}
      {!loading && !error && results.length === 0 && viewMode === 'search' && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">
            상담사 이메일을 입력하고 조회 버튼을 눌러주세요.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            이메일 부분 검색이 가능합니다 (예: "user" 입력 시 "user@example.com" 검색)
          </p>
        </div>
      )}
    </div>
  )
}

