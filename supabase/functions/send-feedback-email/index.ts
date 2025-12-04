// Supabase Edge Function: 피드백 이메일 발송
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@kamo-cs-trainer.com'

interface EmailPayload {
  to: string
  subject: string
  html: string
}

async function sendEmailViaResend(payload: EmailPayload): Promise<Response> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend API error: ${error}`)
  }

  return response.json()
}

serve(async (req) => {
  try {
    // CORS 헤더 설정
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    // 인증 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // 사용자 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 요청 본문 파싱
    const { feedbackId, userEmail, materialTitle, feedbackText, score, threshold } = await req.json()

    if (!feedbackId || !userEmail || !feedbackText) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 이메일 HTML 생성
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>시험 결과 및 피드백</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1e40af;
      margin: 0;
      font-size: 24px;
    }
    .score-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 30px;
    }
    .score-section .score {
      font-size: 48px;
      font-weight: bold;
      margin: 10px 0;
    }
    .retraining-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .retraining-notice h3 {
      color: #92400e;
      margin-top: 0;
    }
    .feedback-section {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .feedback-section h3 {
      color: #1e40af;
      margin-top: 0;
    }
    .feedback-content {
      background-color: white;
      padding: 15px;
      border-radius: 4px;
      border-left: 3px solid #3b82f6;
      white-space: pre-wrap;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CS AI 트레이너</h1>
      <p>시험 결과 및 피드백</p>
    </div>

    <div class="score-section">
      <p style="margin: 0; font-size: 16px;">시험명: ${materialTitle || 'AI 이론 평가'}</p>
      <div class="score">${score !== undefined ? score + '점' : 'N/A'}</div>
      ${threshold !== undefined ? `<p style="margin: 0; opacity: 0.9;">재교육 기준: ${threshold}점</p>` : ''}
    </div>

    ${score !== undefined && threshold !== undefined && score < threshold ? `
    <div class="retraining-notice">
      <h3>⚠️ 재교육 대상 안내</h3>
      <p>귀하의 점수가 재교육 기준(${threshold}점) 미만입니다. 아래 피드백을 참고하여 학습 자료를 복습하고 재시험에 응시해주세요.</p>
    </div>
    ` : ''}

    <div class="feedback-section">
      <h3>📝 관리자 피드백</h3>
      <div class="feedback-content">${feedbackText.replace(/\n/g, '<br>')}</div>
    </div>

    <div style="text-align: center;">
      <a href="https://kamo-cs-trainer.vercel.app/" class="button">시스템 접속하기</a>
    </div>

    <div class="footer">
      <p>이 이메일은 CS AI 트레이너 시스템에서 자동으로 발송되었습니다.</p>
      <p>문의사항이 있으시면 관리자에게 연락해주세요.</p>
    </div>
  </div>
</body>
</html>
    `

    // 이메일 발송
    const emailResult = await sendEmailViaResend({
      to: userEmail,
      subject: `[CS AI 트레이너] 시험 결과 및 피드백 - ${materialTitle || 'AI 이론 평가'}`,
      html: emailHtml,
    })

    // 피드백 상태 업데이트
    const { error: updateError } = await supabase
      .from('quiz_feedbacks')
      .update({
        status: 'sent',
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)

    if (updateError) {
      console.error('Failed to update feedback status:', updateError)
      // 이메일은 발송되었지만 상태 업데이트 실패는 경고만
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: emailResult.id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send email',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

