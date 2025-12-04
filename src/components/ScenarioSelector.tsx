import { useState, useEffect } from 'react'
import { getAllScenarios } from '../services/scenarioService'
import { Scenario } from '../types'

interface ScenarioSelectorProps {
  onSelect: (scenario: Scenario) => void
}

export default function ScenarioSelector({ onSelect }: ScenarioSelectorProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadScenarios()
  }, [])

  const loadScenarios = async () => {
    try {
      const data = await getAllScenarios()
      setScenarios(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '시나리오를 불러오는 중 오류가 발생했습니다.')
      // 에러 발생 시 하드코딩된 시나리오 사용 (fallback)
      try {
        const { scenarios: fallbackScenarios } = await import('../services/scenarios')
        setScenarios(fallbackScenarios)
      } catch {
        // fallback도 실패하면 빈 배열
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">시나리오를 불러오는 중...</p>
      </div>
    )
  }

  if (error && scenarios.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadScenarios}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">시나리오를 선택해주세요</h2>
      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
          ⚠️ {error} (로컬 시나리오를 사용합니다)
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario)}
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow text-left border-2 border-transparent hover:border-blue-500"
          >
            <h3 className="text-xl font-semibold mb-2">{scenario.title}</h3>
            <p className="text-gray-600 mb-3">{scenario.description}</p>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              <p className="font-medium mb-1">고객의 말:</p>
              <p className="italic">"{scenario.customerScript}"</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

