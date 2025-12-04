import { useState, useEffect } from 'react'
import { getAllScenarios, createScenario, updateScenario, deleteScenario } from '../../services/scenarioService'
import { Scenario } from '../../types'

export default function AdminScenarioManager() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<Partial<Scenario>>({
    title: '',
    description: '',
    customerScript: '',
    customerPrompt: '',
    context: '',
    emotion: 'frustrated',
  })

  useEffect(() => {
    loadScenarios()
  }, [])

  const loadScenarios = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllScenarios()
      setScenarios(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '시나리오를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setIsCreating(true)
    setEditingScenario(null)
    setFormData({
      title: '',
      description: '',
      customerScript: '',
      customerPrompt: '',
      context: '',
      emotion: 'frustrated',
    })
  }

  const handleEdit = (scenario: Scenario) => {
    setEditingScenario(scenario)
    setIsCreating(false)
    setFormData({
      title: scenario.title,
      description: scenario.description,
      customerScript: scenario.customerScript,
      customerPrompt: scenario.customerPrompt || '',
      context: scenario.context,
      emotion: scenario.emotion || 'frustrated',
    })
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingScenario(null)
    setFormData({
      title: '',
      description: '',
      customerScript: '',
      customerPrompt: '',
      context: '',
      emotion: 'frustrated',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 유효성 검사
    if (!formData.title || !formData.description || !formData.customerScript || !formData.context) {
      setError('필수 항목을 모두 입력해주세요.')
      return
    }

    try {
      if (isCreating) {
        await createScenario({
          title: formData.title!,
          description: formData.description!,
          customerScript: formData.customerScript!,
          customerPrompt: formData.customerPrompt || undefined,
          context: formData.context!,
          emotion: formData.emotion || 'frustrated',
        })
      } else if (editingScenario) {
        await updateScenario(editingScenario.id, formData)
      }
      
      await loadScenarios()
      handleCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : '시나리오 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 시나리오를 삭제하시겠습니까?')) return

    try {
      await deleteScenario(id)
      await loadScenarios()
    } catch (err) {
      setError(err instanceof Error ? err.message : '시나리오 삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">시나리오를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">음성 시뮬레이션 관리</h2>
        {!isCreating && !editingScenario && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            + 새 시나리오 추가
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 시나리오 생성/수정 폼 */}
      {(isCreating || editingScenario) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">
            {isCreating ? '새 시나리오 추가' : '시나리오 수정'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시나리오 ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingScenario?.id || '자동 생성'}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">시나리오 ID는 자동으로 생성됩니다.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 택시 경로 이탈 불만"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 기사가 앱에 표시된 경로대로 운행하지 않은 경우"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                고객의 초기 말 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.customerScript || ''}
                onChange={(e) => setFormData({ ...formData, customerScript: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 안녕하세요, 방금 택시를 이용했는데요..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시나리오 컨텍스트 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.context || ''}
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="상담원이 어떻게 대응해야 하는지 설명..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI 고객 역할 프롬프트 (선택사항)
              </label>
              <textarea
                value={formData.customerPrompt || ''}
                onChange={(e) => setFormData({ ...formData, customerPrompt: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="AI 고객이 어떻게 행동해야 하는지 설명..."
              />
              <p className="text-xs text-gray-500 mt-1">비워두면 기본 프롬프트가 사용됩니다.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                고객 감정 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.emotion || 'frustrated'}
                onChange={(e) => setFormData({ ...formData, emotion: e.target.value as Scenario['emotion'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="angry">화남 (angry)</option>
                <option value="frustrated">답답함 (frustrated)</option>
                <option value="sad">슬픔 (sad)</option>
                <option value="normal">평온 (normal)</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                {isCreating ? '생성' : '수정'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 시나리오 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제목
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                설명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                감정
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scenarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  등록된 시나리오가 없습니다.
                </td>
              </tr>
            ) : (
              scenarios.map((scenario) => (
                <tr key={scenario.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {scenario.id}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {scenario.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {scenario.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      scenario.emotion === 'angry' ? 'bg-red-100 text-red-800' :
                      scenario.emotion === 'frustrated' ? 'bg-orange-100 text-orange-800' :
                      scenario.emotion === 'sad' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {scenario.emotion === 'angry' ? '화남' :
                       scenario.emotion === 'frustrated' ? '답답함' :
                       scenario.emotion === 'sad' ? '슬픔' : '평온'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(scenario)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(scenario.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

