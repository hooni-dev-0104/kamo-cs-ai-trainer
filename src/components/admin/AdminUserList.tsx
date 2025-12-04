import { useState, useEffect } from 'react'
import { getAllUsers, updateUserRole, updateUserDepartment, UserProfile, DepartmentType, getDepartmentLabel } from '../../services/userManagement'
import { getCurrentUser } from '../../services/auth'

export default function AdminUserList() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [searchEmail, setSearchEmail] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<{ userId: string; department: DepartmentType | null } | null>(null)

  useEffect(() => {
    loadUsers()
    getCurrentUser().then(user => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(data)
      setFilteredUsers(data)
    } catch (err) {
      setError('사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 검색 필터링
  useEffect(() => {
    if (!searchEmail.trim()) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchEmail.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [searchEmail, users])

  const handleRoleChange = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    if (!confirm(`해당 사용자의 권한을 ${newRole}(으)로 변경하시겠습니까?`)) return

    try {
      await updateUserRole(userId, newRole)
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      alert('권한 변경에 실패했습니다.')
    }
  }

  const handleDepartmentEdit = (userId: string, currentDepartment: DepartmentType | null | undefined) => {
    setEditingDepartment({ userId, department: currentDepartment || null })
  }

  const handleDepartmentSave = async () => {
    if (!editingDepartment) return

    try {
      await updateUserDepartment(editingDepartment.userId, editingDepartment.department)
      setUsers(users.map(u => 
        u.id === editingDepartment.userId 
          ? { ...u, department: editingDepartment.department }
          : u
      ))
      setEditingDepartment(null)
    } catch (err) {
      alert('소속 변경에 실패했습니다.')
    }
  }

  const handleDepartmentCancel = () => {
    setEditingDepartment(null)
  }

  if (loading) return <div className="p-4 text-center">데이터를 불러오는 중...</div>
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-4">
      {/* 검색 바 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="email-search" className="block text-sm font-medium text-gray-700 mb-2">
              이메일 검색
            </label>
            <input
              id="email-search"
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-sm text-gray-600 mt-6">
            총 <span className="font-bold text-gray-900">{filteredUsers.length}</span>명
          </div>
        </div>
      </div>

      {/* 사용자 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소속</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">권한</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : (
            filteredUsers.map((user) => {
              const isEditingThisUser = editingDepartment?.userId === user.id
            
            return (
              <tr key={user.id} className={user.id === currentUserId ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                  {user.id === currentUserId && <span className="ml-2 text-xs text-blue-600 font-bold">(나)</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {isEditingThisUser ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingDepartment.department || ''}
                        onChange={(e) => setEditingDepartment({
                          ...editingDepartment,
                          department: e.target.value ? e.target.value as DepartmentType : null
                        })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">미지정</option>
                        <option value="kmcc_yongsan">KMCC 용산</option>
                        <option value="kmcc_gwangju">KMCC 광주</option>
                        <option value="km_crew">KM 크루</option>
                      </select>
                      <button
                        onClick={handleDepartmentSave}
                        className="text-green-600 hover:text-green-800 text-xs"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleDepartmentCancel}
                        className="text-gray-600 hover:text-gray-800 text-xs"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.department 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getDepartmentLabel(user.department)}
                      </span>
                      <button
                        onClick={() => handleDepartmentEdit(user.id, user.department)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        변경
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role === 'admin' ? '관리자' : '사용자'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleRoleChange(user.id, user.role)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {user.role === 'admin' ? '관리자 해제' : '관리자 지정'}
                  </button>
                </td>
              </tr>
            )
          })
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}

