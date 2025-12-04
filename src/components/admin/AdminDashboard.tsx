import { useState } from 'react'
import AdminUserList from './AdminUserList'
import AdminStats from './AdminStats'
import AdminScenarioManager from './AdminScenarioManager'
import AdminFeedbackManager from './AdminFeedbackManager'
import QuizHome from '../quiz/QuizHome'
import { QuizSet, QuizDifficulty } from '../../types/quiz'

interface AdminDashboardProps {
  onQuizGenerated?: (quizSet: QuizSet, materialId: string, difficulty: QuizDifficulty) => void
}

export default function AdminDashboard({ onQuizGenerated }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'materials' | 'stats' | 'scenarios' | 'feedbacks'>('stats')

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex flex-wrap gap-1">
        <button
          className={`py-2 px-6 rounded-md font-medium transition-colors ${
            activeTab === 'stats' 
              ? 'bg-blue-500 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('stats')}
        >
          평가 현황
        </button>
        <button
          className={`py-2 px-6 rounded-md font-medium transition-colors ${
            activeTab === 'scenarios' 
              ? 'bg-blue-500 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('scenarios')}
        >
          시뮬레이션 관리
        </button>
        <button
          className={`py-2 px-6 rounded-md font-medium transition-colors ${
            activeTab === 'users' 
              ? 'bg-blue-500 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('users')}
        >
          사용자 권한 관리
        </button>
        <button
          className={`py-2 px-6 rounded-md font-medium transition-colors ${
            activeTab === 'materials' 
              ? 'bg-blue-500 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('materials')}
        >
          학습 자료 관리
        </button>
        <button
          className={`py-2 px-6 rounded-md font-medium transition-colors ${
            activeTab === 'feedbacks' 
              ? 'bg-blue-500 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('feedbacks')}
        >
          피드백 관리
        </button>
      </div>

      {activeTab === 'stats' ? (
        <AdminStats />
      ) : activeTab === 'scenarios' ? (
        <AdminScenarioManager />
      ) : activeTab === 'users' ? (
        <AdminUserList />
      ) : activeTab === 'feedbacks' ? (
        <AdminFeedbackManager />
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">학습 자료 관리</h2>
          <p className="text-gray-500 mb-6">
            AI 퀴즈 생성을 위한 학습 자료(Zip)를 업로드하거나 삭제할 수 있습니다.<br/>
            여기서 업로드된 자료는 모든 사용자가 'AI 이론 평가' 모드에서 볼 수 있습니다.
          </p>
          {/* 
            QuizHome은 본래 유저용 페이지지만, Admin일 경우 업로드 UI가 나오므로 재사용.
            onQuizGenerated가 전달되면 퀴즈 생성 시 메인 플로우로 이동.
          */}
          <QuizHome onQuizGenerated={onQuizGenerated || ((_quizSet, _materialId, _difficulty) => {})} /> 
        </div>
      )}
    </div>
  )
}

