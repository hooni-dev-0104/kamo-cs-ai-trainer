const GOOGLE_CLOUD_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY

if (!GOOGLE_CLOUD_API_KEY) {
  throw new Error('Missing Google Cloud API key')
}

/**
 * API 호출 재시도 헬퍼 함수
 * @param fn API 호출 함수
 * @param maxRetries 최대 재시도 횟수 (기본값: 3)
 * @param retryDelay 재시도 간격 (ms, 기본값: 1000)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // 할당량 초과나 인증 오류는 재시도하지 않음
      const errorMessage = lastError.message.toLowerCase()
      if (
        errorMessage.includes('quota') ||
        errorMessage.includes('billing') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden')
      ) {
        throw lastError
      }
      
      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        continue
      }
      
      throw lastError
    }
  }
  
  throw lastError || new Error('알 수 없는 오류가 발생했습니다.')
}

/**
 * 네트워크 오류와 API 오류를 구분하는 헬퍼 함수
 */
function handleApiError(error: any, defaultMessage: string): Error {
  // 네트워크 오류 확인
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new Error('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.')
  }
  
  // API 응답 오류
  if (error.error?.message) {
    const errorMessage = error.error.message
    
    // 할당량 초과
    if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
      return new Error('Google Cloud API 할당량이 초과되었습니다. Google Cloud Console에서 사용량을 확인해주세요.')
    }
    
    // 인증 오류
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return new Error('API 인증에 실패했습니다. API 키를 확인해주세요.')
    }
    
    // 모델 오류
    if (errorMessage.includes('model') || errorMessage.includes('not found')) {
      return new Error('AI 모델을 찾을 수 없습니다. 잠시 후 다시 시도해주세요.')
    }
    
    return new Error(`${defaultMessage}: ${errorMessage}`)
  }
  
  // 기타 오류
  return new Error(error.message || defaultMessage)
}

export interface TranscriptionResponse {
  results: Array<{
    alternatives: Array<{
      transcript: string
      confidence: number
    }>
  }>
}

export interface FeedbackResponse {
  empathy: number
  problemSolving: number
  professionalism: number
  tone: number
  overallScore: number
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
}

/**
 * Google Cloud Speech-to-Text API를 사용하여 음성을 텍스트로 변환
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  return withRetry(async () => {
    // WebM을 base64로 변환
    const base64Audio = await blobToBase64(audioBlob)
    const base64Data = base64Audio.split(',')[1] // data:audio/webm;base64, 부분 제거

    let response: Response
    try {
      response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'ko-KR',
              audioChannelCount: 1,
            },
            audio: {
              content: base64Data,
            },
          }),
        }
      )
    } catch (error) {
      throw handleApiError(error, '음성 인식 요청 실패')
    }

    if (!response.ok) {
      let error: any
      try {
        error = await response.json()
      } catch {
        throw new Error(`서버 오류가 발생했습니다. (상태 코드: ${response.status})`)
      }
      throw handleApiError(error, '음성 인식 실패')
    }

    const data: TranscriptionResponse = await response.json()
    
    if (!data.results || data.results.length === 0) {
      throw new Error('음성을 인식할 수 없습니다. 마이크를 확인하고 다시 시도해주세요.')
    }

    return data.results[0].alternatives[0].transcript
  }, 3, 1000)
}

/**
 * Google Cloud Text-to-Speech API를 사용하여 텍스트를 음성으로 변환
 * 사용 가능한 한국어 음성:
 * - ko-KR-Standard-A (여성), B (남성), C (여성), D (남성)
 * - ko-KR-Wavenet-A (여성), B (남성), C (여성), D (남성)
 * - ko-KR-Neural2-A (여성), B (여성), C (남성)
 * 
 * @param text 변환할 텍스트
 * @param voiceName 음성 이름 (기본값: 'ko-KR-Neural2-A')
 * @param emotion 감정 설정 ('angry', 'normal', 'sad' 등)
 */
export async function textToSpeech(
  text: string, 
  voiceName: string = 'ko-KR-Neural2-A',
  emotion: 'angry' | 'normal' | 'sad' | 'frustrated' = 'normal'
): Promise<Blob> {
  // 음성 이름에 따른 성별 매핑
  const getGender = (name: string): 'FEMALE' | 'MALE' => {
    // Neural2: A=여성, B=여성, C=남성 (D는 존재하지 않음)
    if (name.includes('Neural2')) {
      return name.includes('C') ? 'MALE' : 'FEMALE'
    }
    // Wavenet/Standard: A=여성, B=남성, C=여성, D=남성
    return name.includes('A') || name.includes('C') ? 'FEMALE' : 'MALE'
  }

  // 감정에 따른 음성 설정 (품질 개선: volumeGainDb 제거, pitch 조정 - 전체적으로 낮은 톤)
  const getEmotionConfig = (emotion: string) => {
    switch (emotion) {
      case 'angry':
        // 화난 목소리: pitch 약간 높임, rate 빠르게 (기본 톤에서 약간만 높임)
        return {
          pitch: -1.0,     // 낮은 톤 유지하면서 약간 높임 (기본 0, 범위: -20.0 ~ 20.0)
          speakingRate: 1.1, // 약간 빠른 속도 (기본 1.0, 범위: 0.25 ~ 4.0)
          volumeGainDb: 0,  // 볼륨 게인 제거 (울림 방지)
        }
      case 'frustrated':
        // 답답한 목소리: pitch 약간 높임, rate 빠르게
        return {
          pitch: -1.5,     // 낮은 톤 유지
          speakingRate: 1.05,
          volumeGainDb: 0,
        }
      case 'sad':
        // 슬픈 목소리: pitch 낮춤, rate 느리게
        return {
          pitch: -4.0,     // 더 낮은 톤
          speakingRate: 0.95,
          volumeGainDb: 0,
        }
      default: // 'normal'
        return {
          pitch: -2.5,     // 기본 톤을 낮춤 (더 자연스러운 톤)
          speakingRate: 1.0,
          volumeGainDb: 0,
        }
    }
  }

  const emotionConfig = getEmotionConfig(emotion)

  return withRetry(async () => {
    let response: Response
    try {
      response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              text: text,
            },
            voice: {
              languageCode: 'ko-KR',
              name: voiceName,
              ssmlGender: getGender(voiceName),
            },
            audioConfig: {
              audioEncoding: 'LINEAR16', // WAV 형식 (고품질, 모든 브라우저 지원)
              sampleRateHertz: 24000, // 24kHz 샘플링 레이트 (고품질)
              speakingRate: emotionConfig.speakingRate,
              pitch: emotionConfig.pitch,
              volumeGainDb: emotionConfig.volumeGainDb,
            },
          }),
        }
      )
    } catch (error) {
      throw handleApiError(error, '음성 생성 요청 실패')
    }

    if (!response.ok) {
      let error: any
      try {
        error = await response.json()
      } catch {
        throw new Error(`서버 오류가 발생했습니다. (상태 코드: ${response.status})`)
      }
      throw handleApiError(error, '음성 생성 실패')
    }

    const data = await response.json()
    const audioContent = data.audioContent

    if (!audioContent) {
      throw new Error('음성 생성에 실패했습니다. 다시 시도해주세요.')
    }

    // Base64를 Blob으로 변환
    const binaryString = atob(audioContent)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new Blob([bytes], { type: 'audio/wav' })
  }, 3, 1000)
}

/**
 * Google Gemini API를 사용하여 초기 고객 말 생성
 */
export async function generateInitialCustomerMessage(
  scenarioContext: string,
  customerPrompt: string,
  initialScript?: string // 참고용 초기 스크립트 (있으면 참고)
): Promise<string> {
  const prompt = `${customerPrompt}

시나리오 컨텍스트: ${scenarioContext}

${initialScript ? `참고할 수 있는 초기 말 예시: "${initialScript}"` : ''}

위 시나리오와 컨텍스트를 바탕으로 고객이 처음 상담원에게 말할 내용을 생성해주세요. 
- **중요: 여러 가지 상황을 나열하지 마세요. 지금 당장 겪고 있는 단 하나의 구체적인 불만 상황을 연기하세요.**
- 상담원에게 직접 말을 건네는 대화체로 작성하세요. (독백이나 상황 설명 금지)
- 1-2문장으로 간결하게 말하세요.
- 불만이나 문제 상황을 명확히 전달하세요.
- 예시: "기사님이 길을 너무 돌아가셔서 요금이 많이 나왔어요. 이거 환불해 주세요."`

  return withRetry(async () => {
    let response: Response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.9, // 더 다양한 표현을 위해 temperature 높임
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 150,
            },
          }),
        }
      )
    } catch (error) {
      throw handleApiError(error, '초기 고객 말 생성 요청 실패')
    }

    if (!response.ok) {
      let error: any
      try {
        error = await response.json()
      } catch {
        throw new Error(`서버 오류가 발생했습니다. (상태 코드: ${response.status})`)
      }
      throw handleApiError(error, '초기 고객 말 생성 실패')
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error('초기 고객 말을 생성할 수 없습니다. 다시 시도해주세요.')
    }

    return content.trim()
  }, 3, 1000)
}

/**
 * Google Gemini API를 사용하여 고객의 다음 말 생성 (대화형)
 */
export async function generateCustomerResponse(
  scenarioContext: string,
  customerPrompt: string,
  conversationHistory: Array<{ role: 'customer' | 'user'; text: string }>
): Promise<string> {
  const historyText = conversationHistory
    .map((turn) => `${turn.role === 'customer' ? '고객' : '상담원'}: ${turn.text}`)
    .join('\n')

  const prompt = `${customerPrompt}

시나리오 컨텍스트: ${scenarioContext}

대화 히스토리:
${historyText}

위 대화를 바탕으로 고객의 다음 말을 생성해주세요. 고객의 감정과 상황에 맞게 자연스럽고 짧게(1-2문장) 응답해주세요. 대화가 자연스럽게 종료될 수 있도록 "알겠습니다", "감사합니다" 같은 종료 표현도 사용할 수 있습니다.`

  return withRetry(async () => {
    let response: Response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 150,
            },
          }),
        }
      )
    } catch (error) {
      throw handleApiError(error, '고객 응답 생성 요청 실패')
    }

    if (!response.ok) {
      let error: any
      try {
        error = await response.json()
      } catch {
        throw new Error(`서버 오류가 발생했습니다. (상태 코드: ${response.status})`)
      }
      throw handleApiError(error, '고객 응답 생성 실패')
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error('고객 응답을 생성할 수 없습니다. 다시 시도해주세요.')
    }

    return content.trim()
  }, 3, 1000)
}

/**
 * Google Gemini API를 사용하여 응대 내용 분석 및 피드백 생성
 */
export async function analyzeResponse(
  scenarioContext: string,
  conversationHistory: Array<{ role: 'customer' | 'user'; text: string }>
): Promise<FeedbackResponse> {
  const conversationText = conversationHistory
    .map((turn) => `${turn.role === 'customer' ? '고객' : '상담원'}: ${turn.text}`)
    .join('\n')
  const prompt = `당신은 고객 서비스 교육 전문가입니다. 다음 시나리오에서 상담원의 응대를 분석하고 피드백을 제공해주세요.

시나리오 컨텍스트: ${scenarioContext}

전체 대화 내용:
${conversationText}

다음 JSON 형식으로 피드백을 제공해주세요:
{
  "empathy": 0-100 점수,
  "problemSolving": 0-100 점수,
  "professionalism": 0-100 점수,
  "tone": 0-100 점수,
  "overallScore": 0-100 점수,
  "strengths": ["강점1", "강점2"],
  "improvements": ["개선점1", "개선점2"],
  "detailedFeedback": "상세한 피드백 내용"
}

JSON만 응답하고 다른 텍스트는 포함하지 마세요.`

  return withRetry(async () => {
    let response: Response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      )
    } catch (error) {
      throw handleApiError(error, '피드백 분석 요청 실패')
    }

    if (!response.ok) {
      let error: any
      try {
        error = await response.json()
      } catch {
        throw new Error(`서버 오류가 발생했습니다. (상태 코드: ${response.status})`)
      }
      throw handleApiError(error, '피드백 분석 실패')
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error('AI로부터 응답을 받을 수 없습니다. 다시 시도해주세요.')
    }

    try {
      // JSON 추출 (마크다운 코드 블록 제거)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : content
      const parsed = JSON.parse(jsonText) as FeedbackResponse
      
      // 필수 필드 검증
      if (
        typeof parsed.empathy !== 'number' ||
        typeof parsed.problemSolving !== 'number' ||
        typeof parsed.professionalism !== 'number' ||
        typeof parsed.tone !== 'number' ||
        typeof parsed.overallScore !== 'number'
      ) {
        throw new Error('피드백 데이터 형식이 올바르지 않습니다.')
      }
      
      return parsed
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('피드백 데이터를 파싱할 수 없습니다. 다시 시도해주세요.')
      }
      throw error
    }
  }, 3, 1000)
}

/**
 * Google Gemini API를 사용하여 피드백 추천 생성
 */
export async function generateFeedbackRecommendation(
  prompt: string
): Promise<{ 
  recommendedFeedback: string
  wrongQuestionAnalysis?: Array<{
    questionId: number
    questionText: string
    userAnswer: string
    correctAnswer: string
    whyWrong: string
    keyConceptExplanation: string
    learningTip: string
  }>
  weakAreas: Array<{ 
    area: string
    description: string
    improvementPlan?: string
    questions: number[]
    priority?: 'high' | 'medium' | 'low'
  }>
  overallRecommendation?: string
}> {
  return withRetry(async () => {
    let response: Response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json',
            },
          }),
        }
      )
    } catch (error) {
      throw handleApiError(error, '피드백 추천 생성 요청 실패')
    }

    if (!response.ok) {
      let error: any
      try {
        error = await response.json()
      } catch {
        throw new Error(`서버 오류가 발생했습니다. (상태 코드: ${response.status})`)
      }
      throw handleApiError(error, '피드백 추천 생성 실패')
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    console.log('🤖 Gemini API 응답:', {
      hasData: !!data,
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length,
      hasContent: !!content,
      contentPreview: content?.substring(0, 200)
    })

    if (!content) {
      console.error('❌ AI 응답 없음:', data)
      throw new Error('AI로부터 응답을 받을 수 없습니다. 다시 시도해주세요.')
    }

    try {
      console.log('📝 파싱 시도:', content.substring(0, 500))
      const parsed = JSON.parse(content)
      
      console.log('✅ 파싱 성공:', {
        hasRecommendedFeedback: !!parsed.recommendedFeedback,
        wrongQuestionAnalysisCount: parsed.wrongQuestionAnalysis?.length || 0,
        weakAreasCount: parsed.weakAreas?.length || 0,
        hasOverallRecommendation: !!parsed.overallRecommendation
      })

      return {
        recommendedFeedback: parsed.recommendedFeedback || '',
        wrongQuestionAnalysis: parsed.wrongQuestionAnalysis || [],
        weakAreas: parsed.weakAreas || [],
        overallRecommendation: parsed.overallRecommendation || '',
      }
    } catch (error) {
      console.error('❌ JSON 파싱 실패:', error)
      console.error('원본 응답:', content)
      if (error instanceof SyntaxError) {
        throw new Error('피드백 데이터를 파싱할 수 없습니다. AI 응답 형식이 올바르지 않습니다.')
      }
      throw error
    }
  }, 3, 1000)
}

/**
 * Blob을 Base64로 변환하는 헬퍼 함수
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

