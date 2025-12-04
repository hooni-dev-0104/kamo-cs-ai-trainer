import { useState, useEffect, useRef } from 'react'
import { Scenario, AppStep, Feedback, ConversationTurn } from './types'
import { QuizSet, QuizResult as QuizResultType, QuizDifficulty } from './types/quiz'
import { Badge, UserStats } from './types/gamification'
import ScenarioSelector from './components/ScenarioSelector'
import VoicePlayer from './components/VoicePlayer'
import VoiceRecorder from './components/VoiceRecorder'
import FeedbackDisplay from './components/FeedbackDisplay'
import ProgressTracker from './components/ProgressTracker'
import AuthForm from './components/AuthForm'
import ModeSelector from './components/quiz/ModeSelector'
import QuizHome from './components/quiz/QuizHome'
import QuizSolver from './components/quiz/QuizSolver'
import QuizResult from './components/quiz/QuizResult'
import BadgeNotification from './components/BadgeNotification'
import UserProfile from './components/UserProfile'
import Leaderboard from './components/Leaderboard'
import AdminDashboard from './components/admin/AdminDashboard'
import { textToSpeech, transcribeAudio, analyzeResponse, generateCustomerResponse, generateInitialCustomerMessage } from './services/google-cloud'
import { createSession, createResponse, createFeedback } from './services/database'
import { getCurrentUser, onAuthStateChange, signOut } from './services/auth'
import { addScore as addScoreAndCompleteSession, getCurrentUserStats } from './services/userStats'
import { checkAndAwardBadges, getAllBadges } from './services/badges'
import { getCurrentUserProfile } from './services/userManagement'
import { createQuizSession, saveQuizResult } from './services/quizSessions'
import { generateAIFeedbackRecommendation, createQuizFeedback } from './services/quizFeedback'
import { getQuizMaterials } from './services/materials'
import { QuizMaterial } from './types/quiz'
import { User } from '@supabase/supabase-js'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false) // 관리자 상태 추가
  const [currentStep, setCurrentStep] = useState<AppStep>('mode-selection')
  
  // 시뮬레이션 모드 상태
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [customerAudioBlob, setCustomerAudioBlob] = useState<Blob | null>(null)
  const [transcribedText, setTranscribedText] = useState<string>('')
  const [feedback, setFeedback] = useState<Feedback['feedback_json'] | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [currentTurn, setCurrentTurn] = useState<number>(0)
  const [customerVoice, setCustomerVoice] = useState<string>('ko-KR-Neural2-A')

  // 퀴즈 모드 상태
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null)
  const [quizResult, setQuizResult] = useState<QuizResultType | null>(null)
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null)
  const [currentQuizMaterial, setCurrentQuizMaterial] = useState<QuizMaterial | null>(null)

  // 공통 상태
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stepHistoryRef = useRef<AppStep[]>(['mode-selection'])
  const isNavigatingBackRef = useRef(false)
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)

  // 인증 상태 확인
  useEffect(() => {
    getCurrentUser().then((user) => {
      setUser(user)
      setAuthLoading(false)
      if (user) {
        loadUserStats()
        checkAdminStatus()
      }
    })

    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user)
      setAuthLoading(false)
      if (user) {
        loadUserStats()
        checkAdminStatus()
      } else {
        setUserStats(null)
        setIsAdminUser(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const profile = await getCurrentUserProfile()
      if (profile && profile.role === 'admin') {
        setIsAdminUser(true)
      } else {
        setIsAdminUser(false)
      }
    } catch (err) {
      console.error('Failed to check admin status:', err)
      setIsAdminUser(false)
    }
  }

  const loadUserStats = async () => {
    try {
      const stats = await getCurrentUserStats()
      if (stats) {
        setUserStats(stats)
      }
    } catch (err) {
      console.error('Failed to load user stats:', err)
    }
  }

  // 뒤로 가기 처리
  useEffect(() => {
    const handlePopState = () => {
      if (stepHistoryRef.current.length > 1) {
        isNavigatingBackRef.current = true
        stepHistoryRef.current.pop()
        const previousStep = stepHistoryRef.current[stepHistoryRef.current.length - 1]
        
        // 로딩 중이거나 중간 단계일 경우 적절한 단계로 복원
        if (['transcribing', 'generating-response', 'analyzing'].includes(previousStep)) {
          handleReset()
        } else {
          setCurrentStep(previousStep)
        }
        
        isNavigatingBackRef.current = false
      } else {
        handleReset()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 히스토리 업데이트
  useEffect(() => {
    if (!isNavigatingBackRef.current) {
      const currentHistory = stepHistoryRef.current
      const lastStep = currentHistory[currentHistory.length - 1]
      
      if (currentStep !== lastStep) {
        stepHistoryRef.current = [...currentHistory, currentStep]
        window.history.pushState({ step: currentStep }, '', `#${currentStep}`)
      }
    }
  }, [currentStep])

  // 초기 히스토리 설정
  useEffect(() => {
    window.history.replaceState({ step: 'mode-selection' }, '', '#')
  }, [])

  /* --- 핸들러 함수들 --- */

  const handleReset = () => {
    setCurrentStep('mode-selection')
    setSelectedScenario(null)
    setCustomerAudioBlob(null)
    setTranscribedText('')
    setFeedback(null)
    setError(null)
    setSessionId(null)
    setConversationHistory([])
    setCurrentTurn(0)
    setQuizSet(null)
    setQuizResult(null)
    setQuizSessionId(null)
    setEarnedBadges([])
    stepHistoryRef.current = ['mode-selection']
    window.history.replaceState({ step: 'mode-selection' }, '', '#')
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setUser(null)
      handleReset()
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그아웃 중 오류가 발생했습니다.')
    }
  }

  // 모드 선택 핸들러
  const handleModeSelect = (mode: 'simulation' | 'quiz') => {
    if (mode === 'simulation') {
      setCurrentStep('scenario-selection')
    } else {
      setCurrentStep('quiz-home')
    }
  }

  // 시나리오 선택 핸들러
  const handleScenarioSelect = async (scenario: Scenario) => {
    setSelectedScenario(scenario)
    setError(null)
    setLoading(true)
    setCurrentStep('listening')
    setConversationHistory([])
    setCurrentTurn(0)

    const voices = ['ko-KR-Neural2-A', 'ko-KR-Neural2-B', 'ko-KR-Neural2-C']
    const randomVoice = voices[Math.floor(Math.random() * voices.length)]
    setCustomerVoice(randomVoice)

    try {
      const session = await createSession(scenario.id, user?.id || '')
      setSessionId(session.id)

      setCurrentStep('generating-response')
      const customerPrompt = scenario.customerPrompt || 
        `당신은 ${scenario.title} 상황의 고객입니다. 상담원의 응대에 따라 자연스럽게 반응하세요.`
      
      const initialCustomerMessage = await generateInitialCustomerMessage(
        scenario.context,
        customerPrompt,
        scenario.customerScript
      )

      const initialCustomerTurn: ConversationTurn = {
        role: 'customer',
        text: initialCustomerMessage,
        timestamp: new Date(),
      }
      setConversationHistory([initialCustomerTurn])

      const emotion = scenario.emotion || 'angry'
      const audioBlob = await textToSpeech(initialCustomerMessage, randomVoice, emotion)
      setCustomerAudioBlob(audioBlob)
      setCurrentStep('listening')
    } catch (err) {
      setError(err instanceof Error ? err.message : '시나리오 로딩 중 오류가 발생했습니다.')
      setCurrentStep('scenario-selection')
    } finally {
      setLoading(false)
    }
  }

  // 오디오 재생 완료 핸들러
  const handleCustomerAudioEnded = () => {
    setCurrentStep('waiting-for-response')
  }

  // 응답 시작 핸들러
  const handleStartResponse = () => {
    setCurrentStep('recording')
  }

  // 녹음 완료 핸들러
  const handleRecordingComplete = async (audioBlob: Blob) => {
    setCurrentStep('transcribing')
    setLoading(true)
    setError(null)

    try {
      const text = await transcribeAudio(audioBlob)
      setTranscribedText(text)

      if (!sessionId || !selectedScenario) throw new Error('세션 정보가 없습니다.')

      const userTurn: ConversationTurn = {
        role: 'user',
        text: text,
        timestamp: new Date(),
      }
      const updatedHistory = [...conversationHistory, userTurn]
      setConversationHistory(updatedHistory)

      await createResponse(sessionId, undefined, text)
      setCurrentStep('waiting-for-response')
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.')
      setCurrentStep('recording')
    } finally {
      setLoading(false)
    }
  }

  // 응답 제출 핸들러
  const handleSubmitResponse = async () => {
    if (!selectedScenario || conversationHistory.length === 0) {
      setError('응답할 내용이 없습니다.')
      return
    }

    setCurrentStep('generating-response')
    setLoading(true)
    setError(null)

    try {
      const customerPrompt = selectedScenario.customerPrompt || 
        `당신은 ${selectedScenario.title} 상황의 고객입니다. 상담원의 응대에 따라 자연스럽게 반응하세요.`
      
      const customerResponse = await generateCustomerResponse(
        selectedScenario.context,
        customerPrompt,
        conversationHistory
      )

      const customerTurn: ConversationTurn = {
        role: 'customer',
        text: customerResponse,
        timestamp: new Date(),
      }
      setConversationHistory([...conversationHistory, customerTurn])

      const emotion = selectedScenario.emotion || 'angry'
      const customerAudioBlob = await textToSpeech(customerResponse, customerVoice, emotion)
      setCustomerAudioBlob(customerAudioBlob)
      setCurrentStep('listening')
      setCurrentTurn(currentTurn + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : '고객 응답 생성 중 오류가 발생했습니다.')
      setCurrentStep('waiting-for-response')
    } finally {
      setLoading(false)
    }
  }

  // 대화 종료 및 피드백 핸들러
  const handleEndConversation = async () => {
    if (!sessionId || !selectedScenario || conversationHistory.length === 0) {
      setError('분석할 대화가 없습니다.')
      return
    }

    // 대화 종료 확인
    if (!confirm('대화를 종료하고 피드백을 받으시겠습니까?\n\n종료하면 더 이상 대화를 이어갈 수 없습니다.')) {
      return
    }

    setCurrentStep('analyzing')
    setLoading(true)
    setError(null)

    try {
      const feedbackData = await analyzeResponse(selectedScenario.context, conversationHistory)
      setFeedback(feedbackData)

      const lastUserTurn = conversationHistory.filter(turn => turn.role === 'user').pop()
      if (lastUserTurn) {
        const response = await createResponse(sessionId, undefined, lastUserTurn.text)
        await createFeedback(response.id, feedbackData)

        if (user) {
          const updatedStats = await addScoreAndCompleteSession(user.id, feedbackData.overallScore)
          setUserStats(updatedStats)
          
          const badgeIds = await checkAndAwardBadges(
            user.id,
            sessionId,
            feedbackData,
            {
              total_score: updatedStats.total_score,
              completed_sessions: updatedStats.completed_sessions,
            }
          )

          if (badgeIds.length > 0) {
            const allBadges = await getAllBadges()
            const earned = allBadges.filter(b => badgeIds.includes(b.id))
            setEarnedBadges(earned)
          }
        }
      }
      setCurrentStep('feedback')
    } catch (err) {
      setError(err instanceof Error ? err.message : '피드백 생성 중 오류가 발생했습니다.')
      setCurrentStep('waiting-for-response')
    } finally {
      setLoading(false)
    }
  }

  // 퀴즈 생성 핸들러
  const handleQuizGenerated = async (generatedQuizSet: QuizSet, materialId: string, difficulty: QuizDifficulty) => {
    setQuizSet(generatedQuizSet)
    
    // 현재 퀴즈 자료 정보 저장 (제한시간 정보 포함)
    try {
      const materials = await getQuizMaterials()
      const material = materials.find(m => m.id === materialId)
      setCurrentQuizMaterial(material || null)
    } catch (err) {
      console.error('Failed to load material info:', err)
    }
    
    // 퀴즈 세션 생성 (DB 저장)
    if (user) {
      try {
        const session = await createQuizSession(materialId, difficulty)
        setQuizSessionId(session.id)
      } catch (err) {
        console.error('Failed to create quiz session:', err)
        // 세션 생성 실패해도 퀴즈는 진행 가능
        setQuizSessionId(null)
      }
    }
    
    setCurrentStep('quiz-solver')
  }

  // 퀴즈 완료 핸들러
  const handleQuizComplete = async (result: QuizResultType) => {
    setQuizResult(result)
    setCurrentStep('quiz-result')

    // 점수 반영 및 DB 저장
    if (user && quizSet?.materialId) {
      try {
        let sessionId = quizSessionId

        // 세션이 없으면 지금 생성
        if (!sessionId) {
          try {
            const session = await createQuizSession(
              quizSet.materialId,
              quizSet.difficulty || 'medium'
            )
            sessionId = session.id
            setQuizSessionId(sessionId)
          } catch (sessionErr) {
            // 세션 생성 실패해도 통계는 업데이트
          }
        }

        // 세션이 있으면 결과 저장
        let quizResultId: string | null = null
        if (sessionId) {
          try {
            const savedResult = await saveQuizResult(
              sessionId,
              result.totalQuestions,
              result.correctCount,
              result.score,
              result.wrongQuestions,
              result.userAnswers
            )
            quizResultId = savedResult.id

            // 재교육 대상 여부 판단 및 피드백 생성
            try {
              const materials = await getQuizMaterials()
              const material = materials.find(m => m.id === quizSet.materialId)
              const threshold = material?.retraining_threshold || 70

              console.log('📊 퀴즈 결과:', {
                score: result.score,
                threshold,
                isRetraining: result.score < threshold,
                materialId: quizSet.materialId
              })

              if (result.score < threshold) {
                console.log('🎯 재교육 대상 - AI 피드백 생성 시작...')
                console.log('틀린 문제:', result.wrongQuestions)
                console.log('사용자 답변:', result.userAnswers)
                
                try {
                  // 재교육 대상: AI 피드백 추천 생성
                  const aiFeedback = await generateAIFeedbackRecommendation(
                    quizSet.title,
                    result.score,
                    result.totalQuestions,
                    result.correctCount,
                    result.wrongQuestions,
                    result.userAnswers,
                    quizSet.questions
                  )

                  console.log('✅ AI 피드백 생성 완료:', {
                    recommendedFeedback: aiFeedback.recommendedFeedback?.substring(0, 100) + '...',
                    wrongQuestionAnalysisCount: aiFeedback.wrongQuestionAnalysis?.length || 0,
                    weakAreasCount: aiFeedback.weakAreas?.length || 0,
                    hasOverallRecommendation: !!aiFeedback.overallRecommendation
                  })

                  // 피드백 생성 (pending 상태로 저장, 관리자가 검토 후 전송)
                  const savedFeedback = await createQuizFeedback(
                    quizResultId,
                    user.id,
                    quizSet.materialId,
                    aiFeedback.recommendedFeedback, // 기본값으로 AI 추천 피드백 사용
                    aiFeedback.recommendedFeedback,
                    {
                      areas: aiFeedback.weakAreas.map(wa => wa.area),
                      details: aiFeedback.weakAreas,
                    },
                    aiFeedback.wrongQuestionAnalysis, // 틀린 문제 상세 분석 추가
                    aiFeedback.overallRecommendation // 전체 학습 권장사항 추가
                  )

                  console.log('✅ 피드백 DB 저장 완료:', savedFeedback.id)
                  alert('✅ 피드백이 생성되었습니다! 프로필 페이지에서 확인하실 수 있습니다.')
                } catch (feedbackGenErr) {
                  console.error('❌ 피드백 생성 실패:', feedbackGenErr)
                  console.error('에러 상세:', {
                    name: feedbackGenErr instanceof Error ? feedbackGenErr.name : 'Unknown',
                    message: feedbackGenErr instanceof Error ? feedbackGenErr.message : String(feedbackGenErr),
                    stack: feedbackGenErr instanceof Error ? feedbackGenErr.stack : undefined
                  })
                  alert('⚠️ 피드백 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.')
                }
              } else {
                console.log('✅ 합격 - 피드백 생성 안 함 (점수: ' + result.score + ' >= 기준: ' + threshold + ')')
              }
            } catch (feedbackErr) {
              console.error('❌ 피드백 처리 중 전체 오류:', feedbackErr)
              // 피드백 생성 실패해도 계속 진행
            }
          } catch (resultErr) {
            // 결과 저장 실패해도 통계는 업데이트
          }
        }

        // 통계 업데이트 (세션/결과 저장 실패해도 진행)
        const updatedStats = await addScoreAndCompleteSession(user.id, result.score, 'quiz-session')
        setUserStats(updatedStats)
        
        const badgeIds = await checkAndAwardBadges(
          user.id, 
          sessionId || 'quiz-session', 
          result.score,
          {
            total_score: updatedStats.total_score,
            completed_sessions: updatedStats.completed_sessions,
          }
        )
        
        if (badgeIds.length > 0) {
          const allBadges = await getAllBadges()
          const earned = allBadges.filter(b => badgeIds.includes(b.id))
          setEarnedBadges(earned)
        }
      } catch (err) {
        // 에러가 발생해도 사용자에게는 결과를 보여줌
      }
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">로딩 중...</p>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => getCurrentUser().then(setUser)} />
  }

  const isSimulationStep = [
    'scenario-selection', 
    'listening', 
    'waiting-for-response', 
    'recording', 
    'transcribing', 
    'generating-response', 
    'analyzing', 
    'feedback'
  ].includes(currentStep)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 
              className="text-4xl font-bold mb-2 cursor-pointer"
              onClick={() => setCurrentStep('mode-selection')}
            >
              CS AI 트레이너
            </h1>
            <p className="text-gray-600">AI 기반 고객서비스 트레이닝 플랫폼</p>
          </div>
          <div className="flex items-center gap-4">
            {userStats && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm border">
                <div className="text-right">
                  <p className="text-xs text-gray-500">레벨 {userStats.level}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {userStats.total_score.toLocaleString()}점
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">세션</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {userStats.completed_sessions}개
                  </p>
                </div>
              </div>
            )}
            
            {/* 관리자 버튼 (Admin일 때만 표시) */}
            {isAdminUser && (
              <button
                onClick={() => setCurrentStep('admin-dashboard')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                  currentStep === 'admin-dashboard'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                관리자
              </button>
            )}

            {currentStep !== 'mode-selection' && (
              <button
                onClick={() => setCurrentStep('mode-selection')}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                모드 선택
              </button>
            )}

            <button
              onClick={() => setCurrentStep('profile')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                currentStep === 'profile'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              프로필
            </button>
            <button
              onClick={() => setCurrentStep('leaderboard')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                currentStep === 'leaderboard'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              리더보드
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 프로그레스 바 (시뮬레이션 모드일 때만) */}
        {isSimulationStep && (
          <ProgressTracker currentStep={currentStep} />
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 animate-fade-in">
            <p className="font-semibold">오류 발생</p>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm underline"
            >
              닫기
            </button>
          </div>
        )}

        {/* 로딩 인디케이터 (전역) */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {currentStep === 'transcribing' ? '음성을 텍스트로 변환하는 중...' :
               currentStep === 'generating-response' ? 'AI가 응답을 생성하는 중...' :
               currentStep === 'analyzing' ? '대화를 분석하는 중...' :
               '처리 중...'}
            </p>
          </div>
        )}

        {/* --- 메인 컨텐츠 영역 --- */}

        {/* 1. 모드 선택 */}
        {currentStep === 'mode-selection' && (
          <ModeSelector onSelectMode={handleModeSelect} />
        )}

        {/* 2. 시뮬레이션 모드 */}
        {currentStep === 'scenario-selection' && (
          <ScenarioSelector onSelect={handleScenarioSelect} />
        )}

        {currentStep === 'listening' && customerAudioBlob && (
          <div className="max-w-2xl mx-auto">
            <VoicePlayer audioBlob={customerAudioBlob} onEnded={handleCustomerAudioEnded} />
          </div>
        )}

        {currentStep === 'waiting-for-response' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="mb-6">
                <span className="text-6xl">🤔</span>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  {conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'customer'
                    ? '고객의 말을 들으셨나요?'
                    : '응답을 제출하시겠습니까?'}
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'customer' ? (
                  <>
                    <button onClick={handleStartResponse} className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-lg font-semibold">
                      🎤 고객에게 응답하기
                    </button>
                    <button onClick={handleEndConversation} className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold">
                      대화 종료 및 평가
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSubmitResponse} className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-lg font-semibold">
                      ✅ 응답 제출하기
                    </button>
                    <button onClick={handleEndConversation} className="px-8 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold">
                      🛑 대화 종료 및 평가
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === 'recording' && (
          <div className="max-w-2xl mx-auto">
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
            <div className="mt-4 text-center">
              <button onClick={handleEndConversation} className="px-6 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm">
                지금 바로 종료하고 평가받기
              </button>
            </div>
          </div>
        )}

        {currentStep === 'feedback' && feedback && (
          <div className="max-w-4xl mx-auto">
            <FeedbackDisplay feedback={feedback} transcribedText={transcribedText} />
            <div className="mt-8 text-center space-x-4">
              <button onClick={handleReset} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                다른 시나리오 연습하기
              </button>
              <button onClick={() => setCurrentStep('mode-selection')} className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold">
                모드 선택으로 이동
              </button>
            </div>
          </div>
        )}

        {/* 대화 내역 표시 */}
        {isSimulationStep && conversationHistory.length > 0 && currentStep !== 'feedback' && (
          <div className="max-w-2xl mx-auto mt-8 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase">대화 기록</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {conversationHistory.map((turn, idx) => (
                <div key={idx} className={`p-3 rounded-lg text-sm ${turn.role === 'customer' ? 'bg-gray-100 mr-8' : 'bg-blue-50 ml-8 text-right'}`}>
                  <span className="block text-xs font-bold mb-1 text-gray-500">{turn.role === 'customer' ? '고객' : '상담원'}</span>
                  {turn.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. 퀴즈 모드 */}
        {currentStep === 'quiz-home' && (
          <QuizHome onQuizGenerated={handleQuizGenerated} />
        )}

        {currentStep === 'quiz-solver' && quizSet && (
          <QuizSolver 
            quizSet={quizSet} 
            material={currentQuizMaterial || undefined}
            onComplete={handleQuizComplete} 
          />
        )}

        {currentStep === 'quiz-result' && quizSet && quizResult && (
          <QuizResult 
            quizSet={quizSet} 
            result={quizResult} 
            onRetry={() => setCurrentStep('quiz-solver')}
            onHome={() => setCurrentStep('quiz-home')}
          />
        )}

        {/* 4. 관리자 대시보드 */}
        {currentStep === 'admin-dashboard' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <button onClick={() => setCurrentStep('mode-selection')} className="text-blue-500 hover:underline flex items-center gap-1">
                ← 모드 선택으로 돌아가기
              </button>
            </div>
            <AdminDashboard onQuizGenerated={handleQuizGenerated} />
          </div>
        )}

        {/* 5. 공통 페이지 */}
        {currentStep === 'profile' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button onClick={() => setCurrentStep('mode-selection')} className="text-blue-500 hover:underline flex items-center gap-1">
                ← 모드 선택으로 돌아가기
              </button>
            </div>
            <UserProfile 
              user={user}
              userStats={userStats}
            />
          </div>
        )}

        {currentStep === 'leaderboard' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button onClick={() => setCurrentStep('mode-selection')} className="text-blue-500 hover:underline flex items-center gap-1">
                ← 모드 선택으로 돌아가기
              </button>
            </div>
            <Leaderboard />
          </div>
        )}

        {/* 배지 알림 */}
        {earnedBadges.map((badge, index) => (
          <BadgeNotification
            key={`${badge.id}-${index}`}
            badge={badge}
            onClose={() => setEarnedBadges(prev => prev.filter(b => b.id !== badge.id))}
          />
        ))}
      </div>
    </div>
  )
}

export default App
