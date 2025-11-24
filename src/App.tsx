import { useState, useEffect, useRef } from 'react'
import { Scenario, AppStep, Feedback, ConversationTurn } from './types'
import ScenarioSelector from './components/ScenarioSelector'
import VoicePlayer from './components/VoicePlayer'
import VoiceRecorder from './components/VoiceRecorder'
import FeedbackDisplay from './components/FeedbackDisplay'
import ProgressTracker from './components/ProgressTracker'
import { textToSpeech, transcribeAudio, analyzeResponse, generateCustomerResponse } from './services/google-cloud'
import { createSession, createResponse, createFeedback } from './services/database'

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('scenario-selection')
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [customerAudioBlob, setCustomerAudioBlob] = useState<Blob | null>(null)
  const [transcribedText, setTranscribedText] = useState<string>('')
  const [feedback, setFeedback] = useState<Feedback['feedback_json'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [currentTurn, setCurrentTurn] = useState<number>(0)
  const [isConversationEnded, setIsConversationEnded] = useState(false)
  const [customerVoice, setCustomerVoice] = useState<string>('ko-KR-Neural2-A') // 랜덤으로 선택된 고객 목소리
  const stepHistoryRef = useRef<AppStep[]>(['scenario-selection']) // 단계 히스토리 추적
  const isNavigatingBackRef = useRef(false) // 뒤로 가기 중인지 추적

  // 브라우저 뒤로 가기 처리
  useEffect(() => {
    const handlePopState = () => {
      if (stepHistoryRef.current.length > 1) {
        isNavigatingBackRef.current = true
        // 이전 단계로 이동
        stepHistoryRef.current.pop() // 현재 단계 제거
        const previousStep = stepHistoryRef.current[stepHistoryRef.current.length - 1]
        
        // 이전 단계로 복원 (로딩 중인 단계는 건너뛰고 실제 상호작용 가능한 단계로)
        if (previousStep === 'scenario-selection') {
          handleReset()
        } else if (previousStep === 'listening' && customerAudioBlob) {
          setCurrentStep('listening')
        } else if (previousStep === 'recording') {
          setCurrentStep('recording')
        } else if (previousStep === 'feedback' && feedback) {
          setCurrentStep('feedback')
        } else if (['transcribing', 'generating-response', 'analyzing'].includes(previousStep)) {
          // 로딩 단계는 recording으로 이동
          if (conversationHistory.length > 0) {
            setCurrentStep('recording')
          } else if (customerAudioBlob) {
            setCurrentStep('listening')
          } else {
            setCurrentStep('scenario-selection')
          }
        } else {
          setCurrentStep(previousStep)
        }
        
        isNavigatingBackRef.current = false
      } else {
        // 히스토리가 없으면 처음으로
        handleReset()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [customerAudioBlob, feedback, conversationHistory])

  // 단계 변경 시 히스토리 업데이트
  useEffect(() => {
    if (!isNavigatingBackRef.current) {
      // 뒤로 가기가 아닐 때만 히스토리 추가
      const currentHistory = stepHistoryRef.current
      const lastStep = currentHistory[currentHistory.length - 1]
      
      if (currentStep !== lastStep) {
        // 새 단계를 히스토리에 추가
        stepHistoryRef.current = [...currentHistory, currentStep]
        // 브라우저 히스토리에 추가
        window.history.pushState({ step: currentStep }, '', `#${currentStep}`)
      }
    }
  }, [currentStep])

  // 초기 히스토리 설정
  useEffect(() => {
    if (window.location.hash) {
      const hashStep = window.location.hash.slice(1) as AppStep
      if (['scenario-selection', 'listening', 'recording', 'transcribing', 'generating-response', 'analyzing', 'feedback'].includes(hashStep)) {
        // 페이지 로드 시 해시가 있으면 해당 단계로 이동하지 않음 (보안상 이유)
        window.history.replaceState({ step: 'scenario-selection' }, '', '#')
      }
    } else {
      window.history.replaceState({ step: 'scenario-selection' }, '', '#')
    }
  }, [])

  const handleScenarioSelect = async (scenario: Scenario) => {
    setSelectedScenario(scenario)
    setError(null)
    setLoading(true)
    setCurrentStep('listening')
    setConversationHistory([])
    setCurrentTurn(0)
    setIsConversationEnded(false)

    // 랜덤으로 남자/여자 목소리 선택
    // ko-KR-Neural2-A (여성), B (여성), C (남성) - D는 존재하지 않음
    const voices = ['ko-KR-Neural2-A', 'ko-KR-Neural2-B', 'ko-KR-Neural2-C']
    const randomVoice = voices[Math.floor(Math.random() * voices.length)]
    setCustomerVoice(randomVoice)

    try {
      // 세션 생성
      const session = await createSession(scenario.id)
      setSessionId(session.id)

      // 초기 고객 말을 대화 히스토리에 추가
      const initialCustomerTurn: ConversationTurn = {
        role: 'customer',
        text: scenario.customerScript,
        timestamp: new Date(),
      }
      setConversationHistory([initialCustomerTurn])

      // TTS로 고객 음성 생성 (Google Cloud TTS 사용 - 시나리오별 감정 반영, 랜덤 목소리)
      const emotion = scenario.emotion || 'angry' // 기본값: 화난 목소리
      const audioBlob = await textToSpeech(scenario.customerScript, randomVoice, emotion)
      setCustomerAudioBlob(audioBlob)
    } catch (err) {
      setError(err instanceof Error ? err.message : '시나리오 로딩 중 오류가 발생했습니다.')
      setCurrentStep('scenario-selection')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerAudioEnded = () => {
    setCurrentStep('recording')
  }

  const handleRecordingComplete = async (audioBlob: Blob, shouldEndConversation: boolean = false) => {
    setCurrentStep('transcribing')
    setLoading(true)
    setError(null)

    try {
      // 음성 인식
      const text = await transcribeAudio(audioBlob)
      setTranscribedText(text)

      if (!sessionId || !selectedScenario) {
        throw new Error('세션 정보가 없습니다.')
      }

      // 사용자 응대를 대화 히스토리에 추가
      const userTurn: ConversationTurn = {
        role: 'user',
        text: text,
        timestamp: new Date(),
      }
      const updatedHistory = [...conversationHistory, userTurn]
      setConversationHistory(updatedHistory)

      // 응대 기록 저장
      const response = await createResponse(sessionId, undefined, text)

      // 대화 종료 여부 확인
      if (shouldEndConversation || isConversationEnded) {
        // 최종 피드백 분석
        setCurrentStep('analyzing')
        const feedbackData = await analyzeResponse(
          selectedScenario.context,
          updatedHistory
        )
        setFeedback(feedbackData)

        // 피드백 저장
        await createFeedback(response.id, feedbackData)

        setCurrentStep('feedback')
      } else {
        // 고객의 다음 말 생성
        setCurrentStep('generating-response')
        const customerPrompt = selectedScenario.customerPrompt || 
          `당신은 ${selectedScenario.title} 상황의 고객입니다. 상담원의 응대에 따라 자연스럽게 반응하세요.`
        
        const customerResponse = await generateCustomerResponse(
          selectedScenario.context,
          customerPrompt,
          updatedHistory
        )

        // 고객 응답을 대화 히스토리에 추가
        const customerTurn: ConversationTurn = {
          role: 'customer',
          text: customerResponse,
          timestamp: new Date(),
        }
        setConversationHistory([...updatedHistory, customerTurn])

        // 고객 응답을 음성으로 변환 (같은 목소리 유지)
        const emotion = selectedScenario.emotion || 'angry'
        const audioBlob = await textToSpeech(customerResponse, customerVoice, emotion)
        setCustomerAudioBlob(audioBlob)
        setCurrentStep('listening')
        setCurrentTurn(currentTurn + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.')
      setCurrentStep('recording')
    } finally {
      setLoading(false)
    }
  }

  const handleEndConversation = async () => {
    setIsConversationEnded(true)
    // 다음 녹음 완료 시 자동으로 피드백으로 이동
    // 현재 녹음된 오디오가 있다면 즉시 처리
    if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'user') {
      // 이미 사용자 응대가 있으면 피드백으로 이동
      const lastUserTurn = conversationHistory[conversationHistory.length - 1]
      if (sessionId && selectedScenario) {
        setCurrentStep('analyzing')
        setLoading(true)
        try {
          const feedbackData = await analyzeResponse(
            selectedScenario.context,
            conversationHistory
          )
          setFeedback(feedbackData)
          const response = await createResponse(sessionId, undefined, lastUserTurn.text)
          await createFeedback(response.id, feedbackData)
          setCurrentStep('feedback')
        } catch (err) {
          setError(err instanceof Error ? err.message : '피드백 생성 중 오류가 발생했습니다.')
        } finally {
          setLoading(false)
        }
      }
    }
  }

  const handleReset = () => {
    setCurrentStep('scenario-selection')
    setSelectedScenario(null)
    setCustomerAudioBlob(null)
    setTranscribedText('')
    setFeedback(null)
    setError(null)
    setSessionId(null)
    setConversationHistory([])
    setCurrentTurn(0)
    setIsConversationEnded(false)
    setCustomerVoice('ko-KR-Neural2-A') // 초기화
    stepHistoryRef.current = ['scenario-selection'] // 히스토리 초기화
    window.history.replaceState({ step: 'scenario-selection' }, '', '#')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold text-center mb-2">
          CS Voice Trainer
        </h1>
        <p className="text-center text-gray-600 mb-8">
          음성 기반 상담 시뮬레이터
        </p>

        {currentStep !== 'scenario-selection' && (
          <ProgressTracker currentStep={currentStep} />
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-semibold">오류 발생</p>
            <p className="mb-2">{error}</p>
            {error.includes('할당량') && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                <p className="font-semibold mb-1">해결 방법:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li><a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Billing 페이지</a>에서 결제 정보 확인</li>
                  <li><a href="https://console.cloud.google.com/apis/dashboard" target="_blank" rel="noopener noreferrer" className="underline">API Dashboard</a>에서 사용량 확인</li>
                  <li>무료 티어 한도 확인 및 필요시 결제 정보 추가</li>
                </ol>
              </div>
            )}
            <button
              onClick={handleReset}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              처음으로 돌아가기
            </button>
          </div>
        )}

        {loading && currentStep === 'listening' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">고객 음성을 생성하는 중...</p>
          </div>
        )}

        {currentStep === 'scenario-selection' && (
          <ScenarioSelector onSelect={handleScenarioSelect} />
        )}

        {currentStep === 'listening' && customerAudioBlob && (
          <div className="max-w-2xl mx-auto">
            <VoicePlayer audioBlob={customerAudioBlob} onEnded={handleCustomerAudioEnded} />
          </div>
        )}


        {(currentStep === 'transcribing' || currentStep === 'generating-response' || currentStep === 'analyzing') && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {currentStep === 'transcribing' 
                ? '음성을 텍스트로 변환하는 중...' 
                : currentStep === 'generating-response'
                ? '고객의 응답을 생성하는 중...'
                : '응대 내용을 분석하는 중...'}
            </p>
          </div>
        )}

        {/* 대화 히스토리 표시 (상담원의 말만) */}
        {conversationHistory.filter(turn => turn.role === 'user').length > 0 && currentStep !== 'feedback' && (
          <div className="max-w-4xl mx-auto mb-6 bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-3">내 응대 내역</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {conversationHistory
                .filter(turn => turn.role === 'user')
                .map((turn, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-right"
                  >
                    <p className="text-xs font-semibold mb-1 text-gray-600">상담원</p>
                    <p className="text-sm">{turn.text}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {currentStep === 'recording' && (
          <div className="max-w-2xl mx-auto">
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
            <div className="mt-4 text-center">
              <button
                onClick={handleEndConversation}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                대화 종료하고 피드백 받기
              </button>
            </div>
          </div>
        )}

        {currentStep === 'feedback' && feedback && (
          <div className="max-w-4xl mx-auto">
            <FeedbackDisplay feedback={feedback} transcribedText={transcribedText} />
            <div className="mt-6 text-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              >
                새로운 시나리오 시작하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
