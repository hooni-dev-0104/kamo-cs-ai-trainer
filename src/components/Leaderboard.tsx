import { useEffect, useState } from 'react'
import { LeaderboardEntry, LeaderboardPeriod, LeaderboardStatistics, QuestionStatistics } from '../types/gamification'
import { 
  getLeaderboard, 
  getCurrentUserLeaderboardInfo,
  getLeaderboardStatistics,
  getUserPercentile,
  checkRetrainingStatus,
  getQuestionStatistics
} from '../services/leaderboard'
import { supabase } from '../services/supabase'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null)
  const [period, setPeriod] = useState<LeaderboardPeriod>('all')
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState<LeaderboardStatistics | null>(null)
  const [activeTab, setActiveTab] = useState<'ranking' | 'statistics' | 'questions'>('ranking')
  const [questionStats, setQuestionStats] = useState<QuestionStatistics[]>([])
  const [retrainingInfo, setRetrainingInfo] = useState<{
    is_retraining_candidate: boolean
    failed_quizzes: Array<{
      material_id: string
      material_title: string
      latest_score: number
      threshold: number
      date: string
    }>
  } | null>(null)

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        const [leaderboard, userInfo, stats] = await Promise.all([
          getLeaderboard(period, 10),
          getCurrentUserLeaderboardInfo(),
          getLeaderboardStatistics(period),
        ])
        
        setEntries(leaderboard)
        setCurrentUserEntry(userInfo)
        setStatistics(stats)

        // 현재 사용자의 상위 % 계산
        if (user && userInfo) {
          const percentile = await getUserPercentile(user.id, period)
          setCurrentUserEntry({
            ...userInfo,
            percentile,
          })
          setStatistics({
            ...stats,
            current_user_percentile: percentile,
          })
        }

        // 재교육 대상 확인
        if (user) {
          try {
            const retraining = await checkRetrainingStatus(user.id)
            setRetrainingInfo(retraining)
          } catch (err) {
            console.error('Failed to check retraining status:', err)
          }
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [period])

  useEffect(() => {
    if (activeTab === 'questions') {
      const loadQuestionStats = async () => {
        try {
          const stats = await getQuestionStatistics()
          setQuestionStats(stats)
        } catch (err) {
          console.error('Failed to load question statistics:', err)
        }
      }
      loadQuestionStats()
    }
  }, [activeTab])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">리더보드를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">리더보드</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === 'weekly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              주간
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              월간
            </button>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'ranking'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            순위
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'statistics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            통계
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'questions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            문항별 통계
          </button>
        </div>

        {/* 탭별 컨텐츠 */}
        {activeTab === 'ranking' && (
          <>
            {/* 내 순위 표시 */}
            {currentUserEntry && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">내 순위</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {getRankIcon(currentUserEntry.rank)} {currentUserEntry.rank}위
                    </p>
                    {currentUserEntry.percentile !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        상위 {currentUserEntry.percentile}%
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">총 점수</p>
                    <p className="text-xl font-bold text-blue-600">
                      {currentUserEntry.total_score.toLocaleString()}점
                    </p>
                    {statistics && (
                      <p className={`text-xs mt-1 ${
                        currentUserEntry.total_score >= statistics.average_score
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        평균 대비 {currentUserEntry.total_score >= statistics.average_score ? '+' : ''}
                        {(currentUserEntry.total_score - statistics.average_score).toLocaleString()}점
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">완료한 세션</p>
                    <p className="text-xl font-bold text-blue-600">
                      {currentUserEntry.completed_sessions}개
                    </p>
                  </div>
                  {retrainingInfo?.is_retraining_candidate && (
                    <div className="text-right">
                      <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-1 rounded-full">
                        ⚠️ 재교육 대상
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 전체 통계 요약 */}
            {statistics && (
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">전체 상담사</p>
                  <p className="text-xl font-bold text-gray-900">
                    {statistics.total_users}명
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">평균 점수</p>
                  <p className="text-xl font-bold text-blue-600">
                    {statistics.average_score.toLocaleString()}점
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">최고 점수</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {statistics.top_score.toLocaleString()}점
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">재교육 커트라인</p>
                  <p className="text-xl font-bold text-red-600">
                    {statistics.cutoff_score}점
                  </p>
                </div>
              </div>
            )}

            {/* 리더보드 목록 */}
            <div className="space-y-2">
              {entries.map((entry) => {
                const isCurrentUser = currentUserEntry?.user_id === entry.user_id
                const isAboveAverage = statistics && entry.total_score >= statistics.average_score
                const isAboveCutoff = statistics && entry.total_score >= statistics.cutoff_score
                
                return (
                  <div
                    key={entry.user_id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCurrentUser
                        ? 'bg-blue-50 border-blue-300 shadow-md'
                        : entry.rank <= 3
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-gray-700 w-12 text-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {entry.user_name || entry.user_email || '익명'}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                나
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            레벨 {entry.level} • {entry.completed_sessions}개 세션 완료
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {entry.total_score.toLocaleString()}점
                        </p>
                        {statistics && (
                          <div className="flex items-center gap-2 mt-1">
                            {!isAboveCutoff && (
                              <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                재교육 대상
                              </span>
                            )}
                            <span className={`text-xs ${
                              isAboveAverage ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {isAboveAverage ? '↑' : '↓'} 평균
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {entries.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                아직 리더보드 데이터가 없습니다.
              </div>
            )}
          </>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            {statistics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">전체 통계</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">전체 상담사 수</span>
                        <span className="font-bold text-blue-900">{statistics.total_users}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">평균 점수</span>
                        <span className="font-bold text-blue-900">{statistics.average_score.toLocaleString()}점</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">중앙값</span>
                        <span className="font-bold text-blue-900">{statistics.median_score.toLocaleString()}점</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">최고 점수</span>
                        <span className="font-bold text-yellow-600">{statistics.top_score.toLocaleString()}점</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-red-900 mb-4">재교육 기준</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">커트라인 점수</span>
                        <span className="font-bold text-red-900">{statistics.cutoff_score}점</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">기준</span>
                        <span className="font-bold text-red-900">평균의 70%</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-4">
                        이 점수 미만인 상담사는 재교육 대상으로 분류됩니다.
                      </p>
                    </div>
                  </div>
                </div>

                {currentUserEntry && statistics.current_user_percentile !== undefined && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-green-900 mb-4">내 성과 분석</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">상위</p>
                        <p className="text-2xl font-bold text-green-900">
                          {statistics.current_user_percentile}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">평균 대비</p>
                        <p className={`text-2xl font-bold ${
                          currentUserEntry.total_score >= statistics.average_score
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {currentUserEntry.total_score >= statistics.average_score ? '+' : ''}
                          {(currentUserEntry.total_score - statistics.average_score).toLocaleString()}점
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">커트라인 대비</p>
                        <p className={`text-2xl font-bold ${
                          currentUserEntry.total_score >= statistics.cutoff_score
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {currentUserEntry.total_score >= statistics.cutoff_score ? '+' : ''}
                          {(currentUserEntry.total_score - statistics.cutoff_score).toLocaleString()}점
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">재교육 대상</p>
                        <p className={`text-2xl font-bold ${
                          currentUserEntry.total_score >= statistics.cutoff_score
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {currentUserEntry.total_score >= statistics.cutoff_score ? '아니오' : '예'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {retrainingInfo && retrainingInfo.is_retraining_candidate && (
                  <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-red-900 mb-4">⚠️ 재교육 대상 안내</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      다음 시험에서 재교육 기준 점수 미만을 받으셨습니다:
                    </p>
                    <div className="space-y-2">
                      {retrainingInfo.failed_quizzes.map((quiz, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border border-red-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-900">{quiz.material_title}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(quiz.date).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-600">
                                {quiz.latest_score}점
                              </p>
                              <p className="text-xs text-gray-500">
                                기준: {quiz.threshold}점
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700">
                전체 상담사들의 문항별 정답률/오답률 통계입니다. 오답률이 높은 문항일수록 위에 표시됩니다.
              </p>
            </div>

            {questionStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                아직 문항별 통계 데이터가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {questionStats.slice(0, 20).map((stat) => (
                  <div key={stat.question_id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {stat.question_text}
                        </h4>
                        {stat.material_title && (
                          <p className="text-xs text-gray-500 mt-1">
                            {stat.material_title}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          stat.correct_rate >= 70 ? 'text-green-600' : 
                          stat.correct_rate >= 50 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {stat.correct_rate}%
                        </p>
                        <p className="text-xs text-gray-500">정답률</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${stat.correct_rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-16 text-right">
                          정답: {stat.correct_count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${stat.incorrect_rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-16 text-right">
                          오답: {stat.incorrect_count}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        총 {stat.total_attempts}명 응시
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

