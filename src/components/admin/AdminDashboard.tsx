import { useState } from 'react'
import AdminUserList from './AdminUserList'
import QuizHome from '../quiz/QuizHome'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'materials'>('users')

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex">
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
      </div>

      {activeTab === 'users' ? (
        <AdminUserList />
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">학습 자료 관리</h2>
          <p className="text-gray-500 mb-6">
            AI 퀴즈 생성을 위한 학습 자료(Zip)를 업로드하거나 삭제할 수 있습니다.<br/>
            여기서 업로드된 자료는 모든 사용자가 'AI 이론 평가' 모드에서 볼 수 있습니다.
          </p>
          {/* 
            QuizHome은 본래 유저용 페이지지만, Admin일 경우 업로드 UI가 나오므로 재사용.
            onQuizGenerated는 대시보드에서는 불필요하므로 빈 함수 전달.
          */}
          <QuizHome onQuizGenerated={() => {}} /> 
        </div>
      )}
    </div>
  )
}

