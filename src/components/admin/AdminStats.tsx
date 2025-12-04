import { useState, useEffect } from 'react'
import { getQuizStatistics, getRetrainingCandidates, getAllQuizAttempts } from '../../services/admin'
import { updateRetrainingThreshold } from '../../services/materials'
import { QuizStatistics, RetrainingCandidate, QuizAttemptRecord } from '../../types/quiz'

export default function AdminStats() {
  const [statistics, setStatistics] = useState<QuizStatistics[]>([])
  const [candidates, setCandidates] = useState<RetrainingCandidate[]>([])
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingThreshold, setEditingThreshold] = useState<{ materialId: string; value: number } | null>(null)
  const [activeView, setActiveView] = useState<'summary' | 'details'>('summary')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [stats, retraining, allAttempts] = await Promise.all([
        getQuizStatistics(),
        getRetrainingCandidates(),
        getAllQuizAttempts(),
      ])
      setStatistics(stats)
      setCandidates(retraining)
      setAttempts(allAttempts)
      console.log('Loaded data:', {
        stats: stats.length,
        candidates: candidates.length,
        attempts: allAttempts.length
      })
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateThreshold = async (materialId: string, newThreshold: number) => {
    try {
      await updateRetrainingThreshold(materialId, newThreshold)
      await loadData() // 데이터 새로고침
      setEditingThreshold(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '재교육 기준 업데이트에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">데이터를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        {error}
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 평가 진행 현황 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">평가 진행 현황</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('summary')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'summary'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              요약
            </button>
            <button
              onClick={() => setActiveView('details')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'details'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              상세 기록 ({attempts.length}건)
            </button>
          </div>
        </div>

        {activeView === 'summary' ? (
          <>
            {statistics.length === 0 ? (
          <p className="text-gray-500 text-center py-8">등록된 시험이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시험명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 응시자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 세션
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    평균 점수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    재교육 기준
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    재교육 대상
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statistics.map((stat) => (
                  <tr key={stat.material_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.material_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.total_users}명
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.total_sessions}회
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`font-semibold ${
                        stat.average_score >= 80 ? 'text-green-600' :
                        stat.average_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {stat.average_score}점
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingThreshold?.materialId === stat.material_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingThreshold.value}
                            onChange={(e) => setEditingThreshold({
                              materialId: stat.material_id,
                              value: parseInt(e.target.value) || 0
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => handleUpdateThreshold(stat.material_id, editingThreshold.value)}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingThreshold(null)}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{stat.retraining_threshold}점</span>
                          <button
                            onClick={() => setEditingThreshold({
                              materialId: stat.material_id,
                              value: stat.retraining_threshold
                            })}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                            title="재교육 기준 수정"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        stat.retraining_count > 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {stat.retraining_count}명
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </>
        ) : (
          /* 상세 기록 - 누가 어떤 시험을 봤는지 목록 */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    응시일시
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시험명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    난이도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    점수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    정답률
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      응시 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  attempts.map((attempt, index) => (
                    <tr key={`${attempt.session_id}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(attempt.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {attempt.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attempt.material_title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          attempt.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          attempt.difficulty === 'medium' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {attempt.difficulty === 'easy' ? '쉬움' :
                           attempt.difficulty === 'medium' ? '보통' : '어려움'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${
                          attempt.score >= 80 ? 'text-green-600' :
                          attempt.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {attempt.score}점
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attempt.correct_count}/{attempt.total_questions} ({Math.round((attempt.correct_count / attempt.total_questions) * 100)}%)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 재교육 대상 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">재교육 대상</h2>
        
        {candidates.length === 0 ? (
          <p className="text-gray-500 text-center py-8">재교육 대상자가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시험명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    최신 점수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시도 횟수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    최신 응시일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate, index) => (
                  <tr key={`${candidate.user_id}-${candidate.material_id}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {candidate.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidate.material_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        candidate.latest_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {candidate.latest_score}점
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidate.attempt_count}회
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(candidate.latest_session_date).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

