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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <svg
              className="h-8 w-8 text-blue-600"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">이메일 인증이 필요합니다</h1>
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">{email}</span>로 인증 메일을 전송했습니다.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-600 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-1">다음 단계</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>1. 이메일 받은편지함을 확인하세요</p>
                <p>2. 인증 링크를 클릭하세요</p>
                <p>3. 인증 완료 후 이 페이지로 돌아와서 계속하세요</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {resendSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            인증 메일을 다시 전송했습니다. 받은편지함을 확인하세요.
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            disabled={resending}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? '전송 중...' : '인증 메일 다시 보내기'}
          </button>

          <button
            onClick={onBack}
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          >
            로그인으로 돌아가기
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500 text-center">
          인증 메일이 보이지 않나요? 스팸 폴더도 확인해보세요.
        </p>
      </div>
    </div>
  )
}

