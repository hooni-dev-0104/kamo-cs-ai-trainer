import { useEffect, useState } from 'react'
import { UserStats } from '../types/gamification'
import { getCurrentUserStats } from '../services/userStats'
import { User } from '@supabase/supabase-js'
import { QuizFeedback } from '../types/quiz'
import BadgeCollection from './BadgeCollection'
import { getUserQuizFeedbacks, markFeedbackAsRead } from '../services/quizFeedback'
import { getUserScenarioFeedbacks, ScenarioFeedbackWithDetails } from '../services/scenarioFeedback'
import { supabase } from '../services/supabase'

interface UserProfileProps {
  user?: User | null
  userStats?: UserStats | null
}

export default function UserProfile({ user, userStats }: UserProfileProps) {
  const [stats, setStats] = useState<UserStats | null>(userStats || null)
  const [loading, setLoading] = useState(!userStats)
  const [quizFeedbacks, setQuizFeedbacks] = useState<QuizFeedback[]>([])
  const [scenarioFeedbacks, setScenarioFeedbacks] = useState<ScenarioFeedbackWithDetails[]>([])
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false)
  const [feedbackTab, setFeedbackTab] = useState<'quiz' | 'scenario'>('quiz')

  useEffect(() => {
    // props로 전달받은 경우 로딩 불필요
    if (userStats) {
      setStats(userStats)
      setLoading(false)
      return
    }

    // props가 없는 경우 직접 로드
    const loadStats = async () => {
      try {
        const loadedStats = await getCurrentUserStats()
        setStats(loadedStats)
      } catch (err) {
        console.error('Failed to load user stats:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [userStats])

  useEffect(() => {
    if (!user) return

    const loadFeedbacks = async () => {
      setLoadingFeedbacks(true)
      try {
        const [quizFeedbacksData, scenarioFeedbacksData] = await Promise.all([
          getUserQuizFeedbacks(user.id),
          getUserScenarioFeedbacks(user.id),
        ])
        setQuizFeedbacks(quizFeedbacksData)
        setScenarioFeedbacks(scenarioFeedbacksData)
      } catch (err) {
        console.error('Failed to load feedbacks:', err)
      } finally {
        setLoadingFeedbacks(false)
      }
    }

    loadFeedbacks()
  }, [user])

  const handleReadFeedback = async (feedbackId: string) => {
    try {
      await markFeedbackAsRead(feedbackId)
      setQuizFeedbacks(prev => prev.map(f => 
        f.id === feedbackId 
          ? { ...f, status: 'read' as const, read_at: new Date().toISOString() }
          : f
      ))
    } catch (err) {
      console.error('Failed to mark feedback as read:', err)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">프로필을 불러오는 중...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        통계 데이터를 불러올 수 없습니다.
      </div>
    )
  }

  // 다음 레벨까지 필요한 점수 계산 (레벨 1 = 0~99, 레벨 2 = 100~199 ...)
  // 예: 레벨 1 (0점) -> 다음 레벨(2) 필요 점수 100점. 남은 점수 100.
  // 예: 레벨 2 (150점) -> 다음 레벨(3) 필요 점수 200점. 남은 점수 50.
  const nextLevelScore = stats.level * 100
  const currentLevelBaseScore = (stats.level - 1) * 100
  const progress = ((stats.total_score - currentLevelBaseScore) / 100) * 100

  return (
    <div className="space-y-6">
      {/* 통계 대시보드 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold">내 통계</h2>
          {user && (
            <div className="text-right">
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="font-semibold text-gray-900">{user.user_metadata.name || '사용자'}</p>
            </div>
          )}
        </div>

        {/* 레벨 및 진행도 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-semibold text-gray-700">
              레벨 {stats.level}
            </span>
            <span className="text-sm text-gray-500">
              {stats.total_score} / {nextLevelScore}점
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            다음 레벨까지 {nextLevelScore - stats.total_score}점 남음
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">총 점수</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.total_score.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 mb-1">완료한 세션</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.completed_sessions}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">현재 레벨</p>
            <p className="text-3xl font-bold text-purple-600">{stats.level}</p>
          </div>
        </div>
      </div>

      {/* 배지 컬렉션 */}
      <BadgeCollection />

      {/* 피드백 섹션 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">받은 피드백</h2>
        
        {/* 탭 메뉴 */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setFeedbackTab('quiz')}
            className={`px-4 py-2 font-medium transition-colors ${
              feedbackTab === 'quiz'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            퀴즈 피드백 ({quizFeedbacks.length})
          </button>
          <button
            onClick={() => setFeedbackTab('scenario')}
            className={`px-4 py-2 font-medium transition-colors ${
              feedbackTab === 'scenario'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            음성 상담 피드백 ({scenarioFeedbacks.length})
          </button>
        </div>
        
        {loadingFeedbacks ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">피드백을 불러오는 중...</p>
          </div>
        ) : feedbackTab === 'quiz' ? (
          quizFeedbacks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">받은 퀴즈 피드백이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {quizFeedbacks.map((feedback) => (
                <QuizFeedbackItem
                  key={feedback.id}
                  feedback={feedback}
                  onRead={() => handleReadFeedback(feedback.id)}
                />
              ))}
            </div>
          )
        ) : (
          scenarioFeedbacks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">받은 음성 상담 피드백이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {scenarioFeedbacks.map((feedback) => (
                <ScenarioFeedbackItem
                  key={feedback.id}
                  feedback={feedback}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

interface QuizFeedbackItemProps {
  feedback: QuizFeedback
  onRead: () => void
}

function QuizFeedbackItem({ feedback, onRead }: QuizFeedbackItemProps) {
  const [materialTitle, setMaterialTitle] = useState<string>('로딩 중...')
  const isUnread = feedback.status === 'sent' || feedback.status === 'pending'

  useEffect(() => {
    supabase
      .from('quiz_materials')
      .select('title')
      .eq('id', feedback.material_id)
      .single()
      .then(({ data }) => {
        setMaterialTitle(data?.title || '알 수 없음')
      })
  }, [feedback.material_id])

  return (
    <div className={`border rounded-lg p-4 ${isUnread ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{materialTitle}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(feedback.created_at).toLocaleString('ko-KR')}
          </p>
        </div>
        {isUnread && (
          <button
            onClick={onRead}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            읽음 처리
          </button>
        )}
      </div>
      <div className="mt-3">
        <p className="text-gray-800 whitespace-pre-wrap">{feedback.feedback_text}</p>
      </div>
      {feedback.weak_areas && feedback.weak_areas.details && feedback.weak_areas.details.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">개선이 필요한 영역:</h4>
          <div className="flex flex-wrap gap-2">
            {feedback.weak_areas.details.map((area, idx) => (
              <div key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                {area.area}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ScenarioFeedbackItemProps {
  feedback: ScenarioFeedbackWithDetails
}

function ScenarioFeedbackItem({ feedback }: ScenarioFeedbackItemProps) {
  const feedbackData = feedback.feedback_json
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{feedback.session.scenario_title}</h3>
          <p className="text-sm text-gray-600 mt-1">{feedback.session.scenario_description}</p>
          <p className="text-xs text-gray-500 mt-2">
            {new Date(feedback.created_at).toLocaleString('ko-KR')}
          </p>
        </div>
        <div className="ml-4">
          <div className="text-right">
            <span className="text-2xl font-bold text-blue-600">{feedbackData.overallScore}</span>
            <span className="text-sm text-gray-500">/100</span>
          </div>
          <p className="text-xs text-gray-500">종합 점수</p>
        </div>
      </div>

      {/* 점수 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">공감</p>
          <p className="text-lg font-semibold text-purple-600">{feedbackData.empathy}</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">문제 해결</p>
          <p className="text-lg font-semibold text-green-600">{feedbackData.problemSolving}</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">전문성</p>
          <p className="text-lg font-semibold text-blue-600">{feedbackData.professionalism}</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">어조</p>
          <p className="text-lg font-semibold text-orange-600">{feedbackData.tone}</p>
        </div>
      </div>

      {/* 강점 */}
      {feedbackData.strengths && feedbackData.strengths.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-green-700 mb-2">💪 강점</h4>
          <div className="space-y-1">
            {feedbackData.strengths.map((strength, idx) => (
              <div key={idx} className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-700">{strength}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 개선점 */}
      {feedbackData.improvements && feedbackData.improvements.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-orange-700 mb-2">🎯 개선점</h4>
          <div className="space-y-1">
            {feedbackData.improvements.map((improvement, idx) => (
              <div key={idx} className="flex items-start">
                <span className="text-orange-500 mr-2">→</span>
                <span className="text-sm text-gray-700">{improvement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상세 피드백 (접기/펼치기) */}
      {feedbackData.detailedFeedback && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
          >
            {isExpanded ? '▼' : '▶'} 상세 피드백 {isExpanded ? '접기' : '보기'}
          </button>
          {isExpanded && (
            <div className="mt-3 bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedbackData.detailedFeedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
