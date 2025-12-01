import { useEffect, useState } from 'react'
import { LeaderboardEntry, LeaderboardPeriod } from '../types/gamification'
import { getLeaderboard, getCurrentUserLeaderboardInfo } from '../services/leaderboard'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null)
  const [period, setPeriod] = useState<LeaderboardPeriod>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true)
      try {
        const [leaderboard, userInfo] = await Promise.all([
          getLeaderboard(period, 10),
          getCurrentUserLeaderboardInfo(),
        ])
        setEntries(leaderboard)
        setCurrentUserEntry(userInfo)
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [period])

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

      {/* 내 순위 표시 */}
      {currentUserEntry && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">내 순위</p>
              <p className="text-2xl font-bold text-blue-600">
                {getRankIcon(currentUserEntry.rank)} {currentUserEntry.rank}위
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">총 점수</p>
              <p className="text-xl font-bold text-blue-600">
                {currentUserEntry.total_score.toLocaleString()}점
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">완료한 세션</p>
              <p className="text-xl font-bold text-blue-600">
                {currentUserEntry.completed_sessions}개
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 리더보드 목록 */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const isCurrentUser = currentUserEntry?.user_id === entry.user_id
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
    </div>
  )
}

