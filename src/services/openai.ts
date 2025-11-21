const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1'

if (!OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key')
}

export interface TranscriptionResponse {
  text: string
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
 * OpenAI Whisper API를 사용하여 음성을 텍스트로 변환
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'ko')

  const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    const errorMessage = error.error?.message || 'Unknown error'
    
    // 할당량 초과 에러에 대한 친절한 메시지
    if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
      throw new Error(`OpenAI API 할당량이 초과되었습니다. OpenAI 계정의 결제 정보를 확인하고 사용량을 확인해주세요. (${errorMessage})`)
    }
    
    throw new Error(`음성 인식 실패: ${errorMessage}`)
  }

  const data: TranscriptionResponse = await response.json()
  return data.text
}

/**
 * OpenAI TTS API를 사용하여 텍스트를 음성으로 변환
 */
export async function textToSpeech(text: string, voice: string = 'nova'): Promise<Blob> {
  const response = await fetch(`${OPENAI_API_URL}/audio/speech`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    const errorMessage = error.error?.message || 'Unknown error'
    
    // 할당량 초과 에러에 대한 친절한 메시지
    if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
      throw new Error(`OpenAI API 할당량이 초과되었습니다. OpenAI 계정의 결제 정보를 확인하고 사용량을 확인해주세요. (${errorMessage})`)
    }
    
    throw new Error(`TTS 실패: ${errorMessage}`)
  }

  return await response.blob()
}

/**
 * OpenAI GPT API를 사용하여 응대 내용 분석 및 피드백 생성
 */
export async function analyzeResponse(
  scenarioContext: string,
  customerScript: string,
  userResponse: string
): Promise<FeedbackResponse> {
  const prompt = `당신은 고객 서비스 교육 전문가입니다. 다음 시나리오에서 상담원의 응대를 분석하고 피드백을 제공해주세요.

시나리오 컨텍스트: ${scenarioContext}

고객의 말: "${customerScript}"

상담원의 응대: "${userResponse}"

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

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a customer service training expert. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    const errorMessage = error.error?.message || 'Unknown error'
    
    // 할당량 초과 에러에 대한 친절한 메시지
    if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
      throw new Error(`OpenAI API 할당량이 초과되었습니다. OpenAI 계정의 결제 정보를 확인하고 사용량을 확인해주세요. (${errorMessage})`)
    }
    
    throw new Error(`피드백 분석 실패: ${errorMessage}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from GPT')
  }

  try {
    // JSON 추출 (마크다운 코드 블록 제거)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonText = jsonMatch ? jsonMatch[0] : content
    return JSON.parse(jsonText) as FeedbackResponse
  } catch (error) {
    throw new Error(`Failed to parse feedback: ${error}`)
  }
}

