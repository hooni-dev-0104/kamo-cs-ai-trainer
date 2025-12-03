import JSZip from 'jszip'
import { QuizSet } from '../types/quiz'

const GOOGLE_CLOUD_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY

/**
 * PPTX 파일에서 텍스트 추출
 */
async function extractTextFromPptx(pptxData: ArrayBuffer): Promise<string> {
  const zip = new JSZip()
  await zip.loadAsync(pptxData)

  let slidesText = ''
  const slideFiles: string[] = []

  // 슬라이드 파일 찾기 (ppt/slides/slide*.xml)
  zip.forEach((relativePath) => {
    if (relativePath.match(/^ppt\/slides\/slide\d+\.xml$/)) {
      slideFiles.push(relativePath)
    }
  })

  // 슬라이드 번호 순서대로 정렬
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)![0], 10)
    const numB = parseInt(b.match(/\d+/)![0], 10)
    return numA - numB
  })

  const parser = new DOMParser()

  for (const slidePath of slideFiles) {
    const slideXmlStr = await zip.file(slidePath)?.async('string')
    if (!slideXmlStr) continue

    const xmlDoc = parser.parseFromString(slideXmlStr, 'text/xml')
    // <a:t> 태그가 텍스트를 담고 있음 (PowerPoint Open XML format)
    const textNodes = xmlDoc.getElementsByTagName('a:t')
    
    let slideContent = ''
    for (let i = 0; i < textNodes.length; i++) {
      slideContent += textNodes[i].textContent + ' '
    }

    if (slideContent.trim()) {
      slidesText += `\n[Slide ${slideFiles.indexOf(slidePath) + 1}]\n${slideContent.trim()}\n`
    }
  }

  return slidesText
}

/**
 * Zip 파일에서 텍스트 콘텐츠 추출
 */
export async function extractTextFromZip(file: File): Promise<string> {
  const zip = new JSZip()
  const contents = await zip.loadAsync(file)
  let fullText = ''

  // 텍스트 파일 확장자 목록
  const textExtensions = ['.txt', '.md', '.json', '.csv', '.html', '.css', '.js', '.ts', '.tsx', '.py', '.java', '.c', '.cpp']

  for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
    if (zipEntry.dir) continue

    const lowerPath = relativePath.toLowerCase()
    // 확장자 확인
    const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase()

    // PPTX 파일 처리
    if (ext === '.pptx') {
      try {
        const pptxData = await zipEntry.async('arraybuffer')
        
        // 파일 크기 검증 (100MB 제한)
        if (pptxData.byteLength > 100 * 1024 * 1024) {
          throw new Error(`PPTX 파일이 너무 큽니다. (${(pptxData.byteLength / 1024 / 1024).toFixed(2)}MB)`)
        }
        
        const pptxText = await extractTextFromPptx(pptxData)
        
        if (!pptxText || pptxText.trim().length === 0) {
          throw new Error('PPTX 파일에서 텍스트를 추출할 수 없습니다. 슬라이드에 텍스트가 포함되어 있는지 확인해주세요.')
        }
        
        fullText += `\n--- PPTX File: ${relativePath} ---\n${pptxText}\n`
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
        console.warn(`Failed to parse PPTX file ${relativePath}:`, err)
        throw new Error(`PPTX 파일 "${relativePath}" 파싱 실패: ${errorMessage}`)
      }
      continue
    }

    if (textExtensions.includes(ext) || lowerPath.endsWith('readme')) {
      const text = await zipEntry.async('string')
      fullText += `\n--- File: ${relativePath} ---\n${text}\n`
    }
  }

  if (!fullText) {
    throw new Error('Zip 파일에서 텍스트를 추출할 수 없습니다. 텍스트 파일(.txt, .md)이나 파워포인트(.pptx) 파일이 포함되어 있는지 확인해주세요.')
  }

  return fullText
}

/**
 * Gemini API를 사용하여 퀴즈 생성
 */
export async function generateQuizFromMaterials(materialsText: string): Promise<QuizSet> {
  if (!GOOGLE_CLOUD_API_KEY) {
    throw new Error('Google Cloud API Key가 설정되지 않았습니다.')
  }

  const prompt = `
당신은 신입사원 교육 평가 전문가입니다. 제공된 학습 자료를 바탕으로 학습 성취도를 평가할 수 있는 시험 문제를 출제해주세요.

[학습 자료]
${materialsText.substring(0, 100000)} // 너무 길 경우를 대비해 일부 제한 (Gemini 2.0 Flash는 컨텍스트가 길지만 안전하게)

[요청 사항]
1. 총 10문제를 출제해주세요.
2. 1번~5번: 4지선다 객관식 (multiple-choice)
3. 6번~10번: O/X 퀴즈 (true-false)
4. 난이도는 신입사원이 학습 자료를 꼼꼼히 읽었다면 풀 수 있는 수준으로 설정해주세요.
5. 각 문제에는 명확한 정답과 친절한 해설을 포함해주세요.
6. 반드시 아래 JSON 형식으로만 응답해주세요. (Markdown 코드 블록 없이 순수 JSON)

[출력 JSON 형식]
{
  "title": "시험 제목 (자료 내용 기반)",
  "description": "시험 설명",
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "question": "문제 내용",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "correctAnswer": "정답 보기 내용 (options 중 하나와 정확히 일치해야 함)",
      "explanation": "해설 내용"
    },
    {
      "id": 6,
      "type": "true-false",
      "question": "문제 내용",
      "correctAnswer": true, // 또는 false
      "explanation": "해설 내용"
    }
  ]
}
`

  // 재시도 로직을 포함한 API 호출
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.5, // 퀴즈는 정확성이 중요하므로 낮게 설정
                response_mime_type: "application/json" // JSON 응답 강제
              },
            }),
          }
        )
      } catch (error) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        throw new Error('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.')
      }

      if (!response.ok) {
        let error: any
        try {
          error = await response.json()
        } catch {
          throw new Error(`서버 오류가 발생했습니다. (상태 코드: ${response.status})`)
        }
        
        const errorMessage = error.error?.message || 'Unknown error'
        
        // 할당량 초과나 인증 오류는 재시도하지 않음
        if (
          errorMessage.includes('quota') ||
          errorMessage.includes('billing') ||
          errorMessage.includes('permission') ||
          errorMessage.includes('unauthorized')
        ) {
          if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
            throw new Error('Google Cloud API 할당량이 초과되었습니다. Google Cloud Console에서 사용량을 확인해주세요.')
          }
          throw new Error('API 인증에 실패했습니다. API 키를 확인해주세요.')
        }
        
        // 재시도 가능한 오류
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        
        throw new Error(`퀴즈 생성 실패: ${errorMessage}`)
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!content) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        throw new Error('AI로부터 응답을 받을 수 없습니다. 다시 시도해주세요.')
      }

      try {
        const quizSet = JSON.parse(content) as QuizSet
        
        // 데이터 검증
        if (!quizSet.questions || !Array.isArray(quizSet.questions) || quizSet.questions.length === 0) {
          throw new Error('퀴즈 문제가 생성되지 않았습니다.')
        }
        
        if (quizSet.questions.length !== 10) {
          console.warn(`예상된 문제 수(10개)와 다릅니다: ${quizSet.questions.length}개`)
        }
        
        // 각 문제 검증
        for (const q of quizSet.questions) {
          if (!q.question || !q.explanation) {
            throw new Error('퀴즈 문제 형식이 올바르지 않습니다.')
          }
          if (q.type === 'multiple-choice' && (!q.options || q.options.length !== 4)) {
            throw new Error('객관식 문제는 4개의 보기가 필요합니다.')
          }
          if (q.type === 'true-false' && typeof q.correctAnswer !== 'boolean') {
            throw new Error('O/X 문제의 정답은 true 또는 false여야 합니다.')
          }
        }
        
        // ID 재할당
        quizSet.questions = quizSet.questions.map((q, idx) => ({
          ...q,
          id: idx + 1
        }))
        
        return quizSet
      } catch (e) {
        if (e instanceof SyntaxError) {
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            continue
          }
          console.error('JSON Parse Error:', content)
          throw new Error('퀴즈 데이터 형식이 올바르지 않습니다. 다시 시도해주세요.')
        }
        throw e
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // 재시도하지 않을 오류는 즉시 throw
      if (
        lastError.message.includes('할당량') ||
        lastError.message.includes('인증') ||
        lastError.message.includes('네트워크')
      ) {
        throw lastError
      }
      
      // 마지막 시도가 아니면 계속
      if (attempt < maxRetries) {
        continue
      }
    }
  }

  throw lastError || new Error('퀴즈 생성에 실패했습니다. 다시 시도해주세요.')
}

