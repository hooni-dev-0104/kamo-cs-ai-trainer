import { useEffect, useState } from 'react'
import { Badge, UserBadge } from '../types/gamification'
import { getAllBadges, getUserBadges } from '../services/badges'
import { getCurrentUser } from '../services/auth'

export default function BadgeCollection() {
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBadges = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) return

        const [badges, earned] = await Promise.all([
          getAllBadges(),
          getUserBadges(user.id),
        ])

        setAllBadges(badges)
        setUserBadges(earned)
      } catch (err) {
        console.error('Failed to load badges:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBadges()
  }, [])

  const earnedBadgeIds = new Set(userBadges.map(b => b.badge_id))

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">배지를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">배지 컬렉션</h2>
      <div className="mb-4 text-sm text-gray-600">
        {userBadges.length} / {allBadges.length} 배지 획득
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {allBadges.map((badge) => {
          const isEarned = earnedBadgeIds.has(badge.id)
          return (
            <div
              key={badge.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                isEarned
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400 shadow-md'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="text-center">
                <div className={`text-4xl mb-2 ${isEarned ? '' : 'grayscale'}`}>
                  {badge.icon}
                </div>
                <h3
                  className={`font-semibold mb-1 ${
                    isEarned ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {badge.name}
                </h3>
                <p
                  className={`text-xs ${
                    isEarned ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {badge.description}
                </p>
                {isEarned && (
                  <div className="mt-2 text-xs text-yellow-600 font-medium">
                    ✓ 획득
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

