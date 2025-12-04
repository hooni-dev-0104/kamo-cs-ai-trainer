# Send Feedback Email Edge Function

이 Edge Function은 관리자가 작성한 피드백을 사용자에게 이메일로 발송합니다.

## 환경 변수 설정

Supabase Dashboard에서 다음 환경 변수를 설정해야 합니다:

1. `RESEND_API_KEY`: Resend API 키
2. `RESEND_FROM_EMAIL`: 발신자 이메일 주소 (예: noreply@yourdomain.com)

## Resend API 키 발급 방법

1. [Resend](https://resend.com)에 가입
2. API Keys 페이지에서 새 API 키 생성
3. Supabase Dashboard → Edge Functions → Environment Variables에 추가

## 배포 방법

```bash
# Supabase CLI 설치 필요
supabase functions deploy send-feedback-email
```

또는 Supabase Dashboard에서 직접 배포할 수 있습니다.

## 사용 방법

클라이언트에서 다음과 같이 호출:

```typescript
const { data, error } = await supabase.functions.invoke('send-feedback-email', {
  body: {
    feedbackId: 'feedback-uuid',
    userEmail: 'user@example.com',
    materialTitle: '시험 제목',
    feedbackText: '피드백 내용',
    score: 65,
    threshold: 70,
  },
})
```

