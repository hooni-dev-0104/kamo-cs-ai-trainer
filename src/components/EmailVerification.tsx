import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { getCurrentUser } from '../services/auth'

interface EmailVerificationProps {
  email: string
  onVerified: () => void
  onBack: () => void
}

export default function EmailVerification({ email, onVerified, onBack }: EmailVerificationProps) {
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailDomain = email.split('@')[1]?.toLowerCase() || ''
  const inboxUrlByDomain: Record<string, string> = {
    'gmail.com': 'https://mail.google.com',
    'googlemail.com': 'https://mail.google.com',
    'naver.com': 'https://mail.naver.com',
    'daum.net': 'https://mail.daum.net',
    'hanmail.net': 'https://mail.daum.net',
    'kakao.com': 'https://mail.kakao.com',
    'outlook.com': 'https://outlook.live.com/mail',
    'hotmail.com': 'https://outlook.live.com/mail',
    'msn.com': 'https://outlook.live.com/mail',
    'icloud.com': 'https://www.icloud.com/mail',
  }
  const inboxUrl = inboxUrlByDomain[emailDomain] || 'https://mail.google.com'

  // 이메일 인증 완료 감지
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const user = await getCurrentUser()
        if (user && user.email_confirmed_at) {
          // 이메일 인증이 완료되었으면 자동으로 로그인 처리
          onVerified()
        }
      } catch (err) {
        // 에러 무시 (아직 인증되지 않음)
      }
    }

    // 주기적으로 인증 상태 확인 (5초마다)
    const interval = setInterval(checkAuthStatus, 5000)
    
    // 즉시 한 번 확인
    checkAuthStatus()

    return () => clearInterval(interval)
  }, [onVerified])

  // 인증 상태 변경 감지
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        onVerified()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [onVerified])

  const handleResendEmail = async () => {
    setResending(true)
    setError(null)
    setResendSuccess(false)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        throw new Error(error.message)
      }

      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '이메일 재전송 중 오류가 발생했습니다.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-sky-50 to-white px-4 py-8">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center">
        <div className="w-full rounded-2xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-sky-100 backdrop-blur-sm sm:p-8">
          <div className="mb-8 text-center">
            <span className="mb-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
              EMAIL VERIFICATION
            </span>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 shadow-lg shadow-sky-200/80">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">이메일 인증이 필요합니다</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              가입을 완료하려면 인증 메일의 링크를 눌러주세요.
            </p>
            <div className="mt-4 inline-flex max-w-full items-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800">
              <span className="truncate">{email}</span>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              인증 완료 시 자동으로 로그인됩니다
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">다음 단계를 진행하세요</h3>
            <div className="space-y-2">
              {[
                '받은편지함 또는 스팸함에서 인증 메일을 확인하세요',
                '메일 안의 "이메일 인증" 링크를 클릭하세요',
                '이 페이지로 돌아오면 자동으로 다음 화면으로 이동합니다',
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              인증 메일을 다시 전송했습니다. 받은편지함을 확인해 주세요.
            </div>
          )}

          <div className="space-y-3">
            <a
              href={inboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              메일함 열기
            </a>

            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-600 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? '전송 중...' : '인증 메일 다시 보내기'}
            </button>

            <button
              onClick={onBack}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              로그인으로 돌아가기
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            메일이 도착하지 않으면 몇 분 후 다시 시도해 주세요.
          </p>
        </div>
      </div>
    </div>
  )
}
