interface ModeSelectorProps {
  onSelectMode: (mode: 'simulation' | 'quiz') => void
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">학습 모드를 선택해주세요</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 실전 음성 시뮬레이션 모드 */}
        <div 
          onClick={() => onSelectMode('simulation')}
          className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 flex flex-col items-center text-center group"
        >
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
            <span className="text-4xl">🎤</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">실전 음성 트레이닝</h3>
          <p className="text-gray-600 mb-6">
            AI 고객과 직접 대화하며<br/>
            실전 감각을 키우세요.
          </p>
          <button className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold group-hover:bg-blue-600 transition-colors">
            시작하기
          </button>
        </div>

        {/* AI 이론 평가 모드 */}
        <div 
          onClick={() => onSelectMode('quiz')}
          className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500 flex flex-col items-center text-center group"
        >
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors">
            <span className="text-4xl">📝</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">AI 이론 마스터</h3>
          <p className="text-gray-600 mb-6">
            학습 자료(Zip)를 업로드하면<br/>
            AI가 시험 문제를 출제합니다.
          </p>
          <button className="px-6 py-2 bg-purple-500 text-white rounded-full font-semibold group-hover:bg-purple-600 transition-colors">
            시험 보기
          </button>
        </div>
      </div>
    </div>
  )
}

