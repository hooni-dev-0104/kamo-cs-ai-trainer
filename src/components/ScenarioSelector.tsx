import { scenarios } from '../services/scenarios'
import { Scenario } from '../types'

interface ScenarioSelectorProps {
  onSelect: (scenario: Scenario) => void
}

export default function ScenarioSelector({ onSelect }: ScenarioSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">시나리오를 선택해주세요</h2>
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

