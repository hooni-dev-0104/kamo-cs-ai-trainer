import { useState } from 'react'
import { signUp, signIn } from '../services/auth'
import EmailVerification from './EmailVerification'

interface AuthFormProps {
  onAuthSuccess: () => void
}

export type Department = 'kmcc_yongsan' | 'kmcc_gwangju' | 'km_crew'

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState<Department>('kmcc_yongsan')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')

  // 이메일 형식 검증
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 비밀번호 강도 검증
  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) {
      return { valid: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' }
    }
    if (password.length > 128) {
      return { valid: false, message: '비밀번호는 최대 128자까지 가능합니다.' }
    }
    return { valid: true }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 이메일 검증
    if (!email || !email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }

    if (!validateEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다.')
      return
    }

    // 비밀번호 검증
    if (!password || !password.trim()) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.message || '비밀번호가 올바르지 않습니다.')
      return
    }

    // 이름 및 소속 검증 (회원가입 시 - 필수)
    if (!isLogin) {
      if (!name || !name.trim()) {
        setError('이름을 입력해주세요.')
        return
      }
      if (name.trim().length > 100) {
        setError('이름은 최대 100자까지 가능합니다.')
        return
      }
      if (!department) {
        setError('소속을 선택해주세요.')
        return
      }
    }

    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email.trim(), password)
        onAuthSuccess()
      } else {
        // 이름과 소속이 필수이므로 이미 검증됨
        const { session } = await signUp(email.trim(), password, name.trim(), department)
        
        if (session) {
          onAuthSuccess()
        } else {
          // 세션이 바로 생성되지 않은 경우 (이메일 인증 필요 등)
          // 바로 로그인을 시도해본다 (Auto Confirm 설정일 수 있으므로)
          try {
            await signIn(email.trim(), password)
            onAuthSuccess()
          } catch (signInError) {
            // 로그인 실패 시 이메일 인증 화면 표시
            console.log('Sign in failed, showing verification screen:', signInError)
            setVerificationEmail(email.trim())
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
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  소속 <span className="text-red-500">*</span>
                </label>
                <select
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="kmcc_yongsan">KMCC 용산</option>
                  <option value="kmcc_gwangju">KMCC 광주</option>
                  <option value="km_crew">KM 크루</option>
                </select>
              </div>
            </>
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

