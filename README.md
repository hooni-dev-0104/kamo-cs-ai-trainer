# CS Voice Trainer

음성 기반 상담 시뮬레이터 - 고객 서비스 상담원을 위한 AI 기반 훈련 도구

## 프로젝트 개요

CS Voice Trainer는 고객 서비스 상담원이 다양한 시나리오에서 응대 연습을 할 수 있도록 도와주는 웹 애플리케이션입니다. Google Cloud의 Speech-to-Text, Text-to-Speech, Gemini API를 활용하여 실제 고객과의 대화를 시뮬레이션하고, AI 기반 피드백을 제공합니다.

## 주요 기능

1. **시나리오 선택**: 다양한 고객 상담 시나리오 중 선택
2. **AI 고객 음성**: Google Cloud Text-to-Speech를 활용한 자연스러운 고객 음성 재생
3. **음성 녹음**: 브라우저 MediaRecorder API를 활용한 응대 내용 녹음
4. **음성 인식**: Google Cloud Speech-to-Text API를 활용한 음성-텍스트 변환
5. **AI 피드백**: Google Gemini API를 활용한 응대 내용 분석 및 피드백 제공
6. **데이터 저장**: Supabase를 통한 세션 및 피드백 기록 저장

## 기술 스택

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **AI Services**: 
  - Google Cloud Speech-to-Text API (음성 인식, 무료 티어 제공)
  - Google Cloud Text-to-Speech API (음성 생성, 무료 티어 제공)
  - Google Gemini API (피드백 분석, 무료 티어 제공)
- **배포**: Vercel

## 시작하기

### 필수 요구사항

- Node.js 20 이상
- npm 또는 yarn
- Supabase 계정
- Google Cloud API 키 (무료 티어 사용 가능)

### 설치

1. 저장소 클론
```bash
git clone https://github.com/hooni-dev-0104/kamo-cs-trainer.git
cd kamo-cs-trainer
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정하세요:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
VITE_GOOGLE_CLOUD_PROJECT_ID=your_project_id
```

4. Supabase 데이터베이스 설정
`supabase/migrations/001_initial_schema.sql` 파일의 내용을 Supabase SQL Editor에서 실행하세요.

5. 개발 서버 실행
```bash
npm run dev
```

## 프로젝트 구조

```
kamo-cs-trainer/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── ScenarioSelector.tsx
│   │   ├── VoicePlayer.tsx
│   │   ├── VoiceRecorder.tsx
│   │   ├── FeedbackDisplay.tsx
│   │   └── ProgressTracker.tsx
│   ├── hooks/               # Custom React Hooks
│   │   └── useVoiceRecorder.ts
│   ├── services/            # API 및 서비스 로직
│   │   ├── google-cloud.ts
│   │   ├── supabase.ts
│   │   ├── database.ts
│   │   └── scenarios.ts
│   ├── types/               # TypeScript 타입 정의
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── migrations/          # 데이터베이스 마이그레이션
└── public/
```

## 사용 방법

1. 시나리오 선택: 원하는 고객 상담 시나리오를 선택합니다.
2. 고객 음성 듣기: 이어폰/헤드셋을 착용하고 AI 고객의 음성을 들어봅니다.
3. 응대 녹음: 마이크 버튼을 눌러 응대 내용을 녹음합니다.
4. 결과 확인: AI가 분석한 피드백을 확인하고 개선점을 파악합니다.

## 배포

### Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경 변수 설정 (Vercel 대시보드에서)
3. 자동 배포 완료

## 라이선스

ISC

## 개발자

hooni.dev

