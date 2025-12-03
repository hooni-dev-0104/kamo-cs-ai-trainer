# CS AI 트레이너 - 개발 방법서

## 1. 개발 과정 타임라인

### Phase 1: 기본 구조 및 핵심 기능 (초기 개발)
1. **프로젝트 초기 설정**
   - React + TypeScript + Vite 프로젝트 생성
   - Tailwind CSS 설정
   - Supabase 연동 설정

2. **기본 음성 트레이닝 기능**
   - 시나리오 선택 UI 구현
   - Google Cloud Text-to-Speech 연동
   - 음성 녹음 기능 (MediaRecorder API)
   - Google Cloud Speech-to-Text 연동
   - 기본 피드백 시스템

### Phase 2: AI 고도화 (핵심 기능 강화)
3. **대화형 AI 고객 구현**
   - Gemini API를 활용한 동적 고객 응답 생성
   - 대화 히스토리 관리
   - 감정 표현을 포함한 음성 생성 (SSML 활용)

4. **AI 피드백 시스템**
   - Gemini API를 활용한 다차원 평가 (공감, 문제 해결, 전문성, 어조)
   - 상세 피드백 및 개선 제안 생성

### Phase 3: 인증 및 게임화 (사용자 경험 개선)
5. **사용자 인증 시스템**
   - Supabase Auth 연동
   - 회원가입/로그인 기능
   - 이메일 인증 처리

6. **게임화 기능**
   - 사용자 통계 시스템 (점수, 레벨, 완료 세션 수)
   - 배지 시스템 (8가지 배지)
   - 리더보드 기능

### Phase 4: AI 이론 평가 (확장 기능)
7. **학습 자료 기반 퀴즈 시스템**
   - Zip 파일 파싱 (JSZip 활용)
   - PPTX 파일 텍스트 추출 (DOMParser 활용)
   - Gemini API를 활용한 자동 문제 출제
   - 퀴즈 풀이 및 채점 시스템

8. **관리자 시스템**
   - 사용자 권한 관리 (admin/user 역할)
   - 학습 자료 관리 (업로드, 삭제)
   - RLS 정책 설계 및 구현

### Phase 5: 배포 및 최적화 (프로덕션 준비)
9. **배포 설정**
   - Vercel 배포 설정
   - GitHub Actions를 통한 자동 배포
   - 환경 변수 관리

10. **최종 개선**
    - 에러 처리 강화
    - 사용자 경험 개선
    - 문서화

## 2. 기술 선택 이유

### 2.1 Frontend: React + TypeScript + Vite

#### React 선택 이유
- **컴포넌트 기반 아키텍처**: 재사용 가능한 UI 컴포넌트로 개발 효율성 향상
- **풍부한 생태계**: 다양한 라이브러리 및 커뮤니티 지원
- **상태 관리**: 복잡한 상태 관리가 필요한 음성 트레이닝 앱에 적합

#### TypeScript 선택 이유
- **타입 안정성**: 런타임 에러 방지 및 개발 생산성 향상
- **코드 자동완성**: IDE 지원으로 개발 속도 향상
- **유지보수성**: 대규모 프로젝트에서 코드 이해도 향상

#### Vite 선택 이유
- **빠른 개발 서버**: HMR(Hot Module Replacement)로 즉각적인 피드백
- **빠른 빌드 속도**: 프로덕션 빌드 시간 단축
- **최신 표준 지원**: ES modules, TypeScript 네이티브 지원

### 2.2 Backend: Supabase

#### Supabase 선택 이유
- **빠른 개발**: 백엔드 인프라 구축 없이 즉시 사용 가능
- **PostgreSQL**: 강력한 관계형 데이터베이스
- **Row Level Security (RLS)**: 데이터베이스 레벨에서 보안 정책 구현
- **인증 시스템**: Supabase Auth로 사용자 인증 간편 구현
- **실시간 기능**: 필요 시 실시간 데이터 동기화 가능
- **무료 티어**: 프로토타입 개발에 충분한 무료 티어 제공

### 2.3 AI Services: Google Cloud API

#### Google Cloud Speech-to-Text 선택 이유
- **한국어 지원**: 한국어 음성 인식 정확도 95% 이상
- **무료 티어**: 월 60분 무료 제공 (프로토타입에 충분)
- **WebM 형식 지원**: 브라우저 MediaRecorder API와 호환
- **실시간 처리**: 빠른 응답 시간

#### Google Cloud Text-to-Speech 선택 이유
- **한국어 지원**: 자연스러운 한국어 음성 생성
- **Neural2 음성**: 고품질 AI 음성 (감정 표현 가능)
- **SSML 지원**: 감정, 속도, 톤 등 세밀한 제어 가능
- **무료 티어**: 월 4백만 자 무료 제공

#### Google Gemini API 선택 이유
- **대화형 AI**: 대화 히스토리를 고려한 응답 생성
- **긴 컨텍스트**: 학습 자료 기반 퀴즈 생성에 적합
- **JSON 응답**: 구조화된 피드백 및 퀴즈 데이터 생성
- **무료 티어**: 충분한 무료 할당량 제공
- **한국어 지원**: 한국어 프롬프트 및 응답 지원

### 2.4 스타일링: Tailwind CSS

#### Tailwind CSS 선택 이유
- **빠른 개발**: 유틸리티 클래스로 빠른 스타일링
- **일관된 디자인**: 디자인 시스템 구축 용이
- **반응형 디자인**: 모바일 최적화 간편
- **번들 크기 최적화**: 사용하지 않는 CSS 자동 제거

### 2.5 배포: Vercel

#### Vercel 선택 이유
- **Git 연동**: GitHub와 자동 연동으로 배포 간편
- **환경 변수 관리**: 안전한 환경 변수 관리
- **빠른 CDN**: 전 세계 빠른 로딩 속도
- **무료 티어**: 프로토타입 배포에 충분

## 3. 주요 기술적 도전과제 및 해결 과정

### 3.1 음성 감정 표현 구현

#### 도전과제
- Google Cloud Text-to-Speech에서 감정을 표현하는 방법
- 화난 고객, 답답한 고객 등 다양한 감정 상태 표현

#### 해결 과정
1. **SSML (Speech Synthesis Markup Language) 활용**
   - `<prosody>` 태그로 pitch, rate, volume 제어
   - 감정별 파라미터 설정:
     - `angry`: 높은 pitch, 빠른 rate, 높은 volume
     - `frustrated`: 중간 pitch, 빠른 rate, 중간 volume
     - `sad`: 낮은 pitch, 느린 rate, 낮은 volume
     - `normal`: 기본값

2. **음성 선택**
   - Neural2 음성 사용 (고품질)
   - 남성/여성 랜덤 선택으로 다양성 확보

3. **구현 위치**: `src/services/google-cloud.ts`의 `textToSpeech` 함수

```typescript
// 감정별 SSML 파라미터 설정
const emotionConfig = {
  angry: { pitch: '+10%', rate: '1.2', volume: '+3dB' },
  frustrated: { pitch: '+5%', rate: '1.1', volume: '+1dB' },
  sad: { pitch: '-10%', rate: '0.9', volume: '-2dB' },
  normal: { pitch: '0%', rate: '1.0', volume: '0dB' }
}
```

#### 학습 내용
- SSML을 활용한 음성 제어 방법
- 감정 표현을 위한 음성 파라미터 조정

### 3.2 대화형 AI 고객 구현

#### 도전과제
- 상담원의 응대에 따라 고객의 반응이 동적으로 변화해야 함
- 대화 히스토리를 고려한 자연스러운 응답 생성

#### 해결 과정
1. **Gemini API 활용**
   - 대화 히스토리를 프롬프트에 포함
   - 고객 역할 프롬프트로 일관된 캐릭터 유지

2. **대화 히스토리 관리**
   - `ConversationTurn[]` 배열로 대화 기록
   - 각 턴마다 역할(customer/user)과 텍스트 저장

3. **동적 응답 생성**
   - 상담원의 응대 내용을 분석하여 고객 감정 변화 반영
   - 프롬프트에 "상담원이 잘 대응하면 감정이 누그러지고, 그렇지 않으면 더 화가 날 수 있다"는 지시 포함

4. **구현 위치**: `src/services/google-cloud.ts`의 `generateCustomerResponse` 함수

#### 학습 내용
- 대화형 AI 구현 방법
- 프롬프트 엔지니어링 기법
- 대화 히스토리 관리 패턴

### 3.3 PPTX 파일 파싱

#### 도전과제
- PPTX 파일은 ZIP 형식의 XML 구조
- 슬라이드별로 텍스트 추출 필요
- 브라우저에서 직접 파싱해야 함

#### 해결 과정
1. **JSZip 활용**
   - PPTX 파일을 ZIP으로 처리
   - `ppt/slides/slide*.xml` 파일 추출

2. **DOMParser 활용**
   - XML 문자열을 DOM으로 파싱
   - `<a:t>` 태그에서 텍스트 추출 (PowerPoint Open XML format)

3. **슬라이드 순서 정렬**
   - 파일명에서 슬라이드 번호 추출
   - 번호 순서대로 정렬하여 텍스트 결합

4. **구현 위치**: `src/services/quiz.ts`의 `extractTextFromPptx` 함수

```typescript
// 슬라이드 파일 찾기 및 정렬
const slideFiles = []
zip.forEach((relativePath) => {
  if (relativePath.match(/^ppt\/slides\/slide\d+\.xml$/)) {
    slideFiles.push(relativePath)
  }
})
slideFiles.sort((a, b) => {
  const numA = parseInt(a.match(/\d+/)![0], 10)
  const numB = parseInt(b.match(/\d+/)![0], 10)
  return numA - numB
})
```

#### 학습 내용
- PPTX 파일 구조 이해
- 브라우저에서 ZIP/XML 파싱 방법
- PowerPoint Open XML format

### 3.4 RLS 정책 설계

#### 도전과제
- 사용자별 데이터 접근 제어
- 관리자 권한 관리
- 보안 정책 구현

#### 해결 과정
1. **profiles 테이블 생성**
   - `id`, `email`, `role` 필드
   - `auth.users`와 연동

2. **is_admin() 함수 생성**
   - 현재 사용자의 role이 'admin'인지 확인
   - SECURITY DEFINER로 실행 권한 부여

3. **RLS 정책 설정**
   - 사용자는 자신의 데이터만 접근 가능
   - 관리자는 모든 데이터 접근 가능
   - quiz_materials는 인증된 사용자는 읽기, 관리자는 쓰기

4. **트리거 설정**
   - `on_auth_user_created` 트리거로 자동 프로필 생성
   - 이메일에 'admin' 포함 시 자동 관리자 지정

5. **구현 위치**: `supabase/migrations/004_user_management.sql`

#### 학습 내용
- Row Level Security (RLS) 정책 설계
- PostgreSQL 함수 및 트리거
- 보안 모범 사례

### 3.5 API 오류 처리

#### 도전과제
- 네트워크 오류와 API 오류 구분
- 사용자 친화적 에러 메시지
- 재시도 로직 구현

#### 해결 과정
1. **에러 타입 구분**
   - 네트워크 오류: `response.ok === false` 및 네트워크 에러
   - API 오류: API 응답의 `error` 필드 확인
   - 할당량 오류: `quota` 또는 `billing` 키워드 확인

2. **사용자 친화적 메시지**
   - 기술적 에러 메시지를 한국어로 변환
   - 해결 방법 제시 (예: "Google Cloud Console에서 사용량 확인")

3. **구현 위치**: `src/services/google-cloud.ts`의 각 API 함수

#### 학습 내용
- 에러 처리 모범 사례
- 사용자 경험을 고려한 에러 메시지 작성

## 4. 개발 히스토리

### 주요 마일스톤

#### 1. 초기 커밋 (3f4f28c)
- 프로젝트 기본 구조 설정
- React + TypeScript + Vite 프로젝트 생성
- 기본 컴포넌트 구조

#### 2. 로그인 기능 구현 (b357545)
- Supabase Auth 연동
- 회원가입/로그인 UI 구현
- 이메일 인증 처리

#### 3. Vercel 배포 설정 (e83540b, 5fd77f5, 55aad6f)
- Vercel 프로젝트 설정
- 환경 변수 관리
- 배포 자동화

#### 4. GitHub Actions 자동 배포 (61733a2, 9fcb718)
- GitHub Actions 워크플로우 설정
- Vercel Deployment API 연동
- 자동 배포 파이프라인 구축

#### 5. 학습 자료 기반 퀴즈 기능 (7ca2d00)
- Zip 파일 파싱 구현
- PPTX 파일 텍스트 추출
- Gemini API를 활용한 자동 문제 출제
- 퀴즈 풀이 및 채점 시스템

#### 6. 학습 자료 업로드 기능 (3ad5225)
- 관리자용 학습 자료 업로드 UI
- Supabase에 학습 자료 저장
- 자료 목록 조회 기능

#### 7. 최종 개선 (ae2e940)
- UI 문구 개선
- 사용자 경험 개선
- 문서화

## 5. 아키텍처 개요

### 5.1 시스템 구조

```
┌─────────────────┐
│   React Client  │
│  (Vite + TS)    │
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
┌────────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│  Supabase       │ │  Google    │ │  Google Cloud   │
│  (PostgreSQL +  │ │  Gemini    │ │  Speech/TTS     │
│   Auth)         │ │  API       │ │  API            │
└─────────────────┘ └────────────┘ └─────────────────┘
```

### 5.2 데이터 흐름

#### 실전 음성 트레이닝 플로우
1. 사용자가 시나리오 선택
2. AI가 초기 고객 메시지 생성 (Gemini)
3. 고객 음성 재생 (Text-to-Speech)
4. 사용자 음성 녹음 (MediaRecorder)
5. 음성 텍스트 변환 (Speech-to-Text)
6. AI 고객 응답 생성 (Gemini)
7. 대화 반복 (3-6)
8. 대화 종료 시 피드백 생성 (Gemini)
9. 결과 저장 (Supabase)

#### AI 이론 평가 플로우
1. 관리자가 학습 자료 업로드 (Zip 파일)
2. 텍스트 추출 (JSZip + DOMParser)
3. 자료 저장 (Supabase)
4. 사용자가 자료 선택
5. AI 문제 출제 (Gemini)
6. 사용자가 문제 풀이
7. 즉시 채점 및 해설 제공
8. 점수 저장 (Supabase)

### 5.3 주요 컴포넌트 구조

```
src/
├── components/
│   ├── quiz/          # 퀴즈 관련 컴포넌트
│   ├── admin/          # 관리자 컴포넌트
│   └── ...             # 기타 UI 컴포넌트
├── services/
│   ├── google-cloud.ts # Google Cloud API 연동
│   ├── supabase.ts     # Supabase 클라이언트
│   ├── database.ts     # 데이터베이스 작업
│   ├── quiz.ts         # 퀴즈 관련 서비스
│   └── ...             # 기타 서비스
├── types/              # TypeScript 타입 정의
└── App.tsx             # 메인 앱 컴포넌트
```

## 6. 트러블슈팅 경험

### 6.1 OpenAI API 할당량 초과
- **문제**: OpenAI API 무료 티어 한도 초과
- **해결**: Google Cloud API로 전환 (무료 티어 제공)
- **학습**: 여러 AI 서비스 비교 및 선택의 중요성

### 6.2 Google Cloud TTS 음성 선택 오류
- **문제**: 존재하지 않는 음성 이름 사용
- **해결**: Google Cloud 문서 확인 후 올바른 음성 이름 사용
- **학습**: API 문서 정확히 읽는 것의 중요성

### 6.3 PPTX 파일 파싱 실패
- **문제**: PPTX 파일에서 텍스트 추출 실패
- **해결**: PowerPoint Open XML format 이해 및 DOMParser 활용
- **학습**: 복잡한 파일 형식 파싱 방법

### 6.4 RLS 정책 오류
- **문제**: 관리자 권한 확인 함수가 작동하지 않음
- **해결**: SECURITY DEFINER 설정 및 함수 권한 확인
- **학습**: 데이터베이스 보안 정책 설계

## 7. 개선 사항 및 향후 계획

### 7.1 단기 개선 사항
- API 호출 재시도 로직 추가
- 에러 처리 강화
- 사용자 경험 개선 (로딩 상태, 피드백 UI)

### 7.2 중기 개선 사항
- 통계 대시보드 구현
- 세션 히스토리 기능
- 성능 최적화 (코드 스플리팅, 캐싱)

### 7.3 장기 개선 사항
- 모바일 앱 출시
- 다국어 지원
- AI 모델 고도화

## 8. 개발 방법론

### 8.1 개발 프로세스
1. **기획 및 설계**: 기능 요구사항 정의 및 아키텍처 설계
2. **프로토타입 개발**: 핵심 기능부터 구현
3. **테스트 및 개선**: 사용자 테스트 및 피드백 반영
4. **문서화**: 코드 주석 및 사용자 가이드 작성

### 8.2 코드 관리
- **Git**: 버전 관리 및 협업
- **TypeScript**: 타입 안정성 확보
- **컴포넌트 기반**: 재사용 가능한 컴포넌트 설계

### 8.3 배포 프로세스
- **GitHub**: 소스 코드 관리
- **GitHub Actions**: 자동 빌드 및 배포
- **Vercel**: 프로덕션 배포

---

**작성일**: 2025년 1월  
**버전**: 1.0  
**작성자**: hooni.dev

