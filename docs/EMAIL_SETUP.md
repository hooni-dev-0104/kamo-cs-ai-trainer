# 이메일 발송 기능 설정 가이드

## 개요

CS AI 트레이너는 Resend API를 사용하여 피드백 이메일을 발송합니다.

## 1. Resend 계정 생성 및 API 키 발급

1. [Resend 웹사이트](https://resend.com)에 접속
2. 무료 계정 생성 (월 3,000건 무료)
3. Dashboard → API Keys로 이동
4. "Create API Key" 클릭
5. API 키 복사 (한 번만 표시되므로 안전하게 보관)

## 2. Supabase Edge Function 배포

### 방법 1: Supabase Dashboard 사용 (권장)

1. Supabase Dashboard 접속
2. Edge Functions 메뉴로 이동
3. "Create a new function" 클릭
4. Function 이름: `send-feedback-email`
5. `supabase/functions/send-feedback-email/index.ts` 파일 내용 복사하여 붙여넣기
6. Environment Variables 추가:
   - `RESEND_API_KEY`: Resend에서 발급받은 API 키
   - `RESEND_FROM_EMAIL`: 발신자 이메일 (예: `noreply@yourdomain.com`)
7. "Deploy" 클릭

### 방법 2: Supabase CLI 사용

```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# Supabase 프로젝트에 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref your-project-ref

# Edge Function 배포
supabase functions deploy send-feedback-email
```

## 3. 도메인 인증 (선택 사항)

프로덕션 환경에서는 도메인을 인증하는 것이 좋습니다:

1. Resend Dashboard → Domains로 이동
2. "Add Domain" 클릭
3. DNS 레코드 추가 (Resend에서 제공하는 가이드 따르기)
4. 인증 완료 후 `RESEND_FROM_EMAIL`을 인증된 도메인으로 변경

## 4. 테스트

1. 관리자 계정으로 로그인
2. "피드백 관리" 탭으로 이동
3. 대기 중인 피드백 선택
4. "전송" 버튼 클릭
5. 사용자 이메일 확인

## 5. 문제 해결

### 이메일이 발송되지 않는 경우

1. **Edge Function 로그 확인**
   - Supabase Dashboard → Edge Functions → Logs
   - 에러 메시지 확인

2. **환경 변수 확인**
   - `RESEND_API_KEY`가 올바르게 설정되었는지 확인
   - `RESEND_FROM_EMAIL`이 올바른 형식인지 확인

3. **Resend API 상태 확인**
   - Resend Dashboard → Logs에서 발송 시도 확인
   - 실패한 경우 에러 메시지 확인

### CORS 오류 발생 시

Edge Function의 CORS 헤더가 올바르게 설정되어 있는지 확인:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`

## 6. 비용

- Resend 무료 티어: 월 3,000건
- 초과 시: $20/월 (50,000건)

## 7. 대안

Resend 대신 다른 이메일 서비스를 사용하려면:

1. `supabase/functions/send-feedback-email/index.ts` 파일 수정
2. 해당 서비스의 API에 맞게 `sendEmailViaResend` 함수 수정
3. 환경 변수 업데이트

### 지원 가능한 대안
- SendGrid
- Mailgun
- AWS SES
- Postmark

