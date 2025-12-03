import { useState } from 'react'
import { signUp, signIn } from '../services/auth'
import EmailVerification from './EmailVerification'

interface AuthFormProps {
  onAuthSuccess: () => void
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
        onAuthSuccess()
          } else {
            const { session } = await signUp(email, password, name)
            
            if (session) {
              onAuthSuccess()
            } else {
              // 세션이 바로 생성되지 않은 경우 (이메일 인증 필요 등)
              // 바로 로그인을 시도해본다 (Auto Confirm 설정일 수 있으므로)
              try {
                await signIn(email, password)
                onAuthSuccess()
              } catch (signInError) {
                // 로그인 실패 시 이메일 인증 화면 표시
                console.log('Sign in failed, showing verification screen:', signInError)
                setVerificationEmail(email)
                setShowEmailVerification(true)
              }
            }
          }
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 이메일 인증 완료 후 처리
  const handleEmailVerified = () => {
    setShowEmailVerification(false)
    onAuthSuccess()
  }

  // 이메일 인증 페이지에서 뒤로 가기
  const handleBackFromVerification = () => {
    setShowEmailVerification(false)
    setEmail('')
    setPassword('')
    setName('')
    setIsLogin(true)
  }

  // 이메일 인증 페이지 표시
  if (showEmailVerification) {
    return (
      <EmailVerification
        email={verificationEmail}
        onVerified={handleEmailVerified}
        onBack={handleBackFromVerification}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CS AI 트레이너</h1>
          <p className="text-gray-600">AI 기반 고객서비스 트레이닝 플랫폼</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isLogin
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isLogin
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                이름 (선택사항)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="홍길동"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="최소 6자 이상"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        {!isLogin && (
          <p className="mt-4 text-xs text-gray-500 text-center">
            회원가입 시 이메일 인증이 필요할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  )
}

