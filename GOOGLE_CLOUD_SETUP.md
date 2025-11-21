# Google Cloud API 설정 가이드

## 1. Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 ID 확인

## 2. API 활성화

다음 API들을 활성화해야 합니다:

### Speech-to-Text API
1. [Speech-to-Text API 페이지](https://console.cloud.google.com/apis/library/speech.googleapis.com) 접속
2. **사용 설정** 클릭

### Text-to-Speech API
1. [Text-to-Speech API 페이지](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com) 접속
2. **사용 설정** 클릭

### Generative Language API (Gemini)
1. [Generative Language API 페이지](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) 접속
2. **사용 설정** 클릭

## 3. API 키 생성

1. [API 및 서비스 > 사용자 인증 정보](https://console.cloud.google.com/apis/credentials) 접속
2. **+ 사용자 인증 정보 만들기** > **API 키** 선택
3. 생성된 API 키 복사
4. (선택) API 키 제한 설정:
   - 애플리케이션 제한: HTTP 리퍼러(웹사이트)
   - API 제한: Speech-to-Text API, Text-to-Speech API, Generative Language API

## 4. 무료 티어 정보

### Speech-to-Text API
- **무료**: 월 60분까지 무료
- 초과 시: $0.006/15초

### Text-to-Speech API
- **무료**: 월 0-4백만자까지 무료
- 초과 시: $4.00/백만자

### Gemini API
- **무료**: 월 15 RPM (Requests Per Minute)
- 초과 시: 유료 플랜 필요

## 5. 환경 변수 설정

`.env` 파일에 다음을 추가:

```env
VITE_GOOGLE_CLOUD_API_KEY=your_api_key_here
VITE_GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
```

## 6. 사용량 모니터링

- [API 대시보드](https://console.cloud.google.com/apis/dashboard)에서 사용량 확인
- [할당량 페이지](https://console.cloud.google.com/apis/api/speech.googleapis.com/quotas)에서 할당량 확인

## 참고 자료

- [Speech-to-Text API 문서](https://cloud.google.com/speech-to-text/docs)
- [Text-to-Speech API 문서](https://cloud.google.com/text-to-speech/docs)
- [Gemini API 문서](https://ai.google.dev/docs)

