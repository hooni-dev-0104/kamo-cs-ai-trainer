import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    name?: string
  }
}

/**
 * 이메일과 비밀번호로 회원가입
 */
export type Department = 'kmcc_yongsan' | 'kmcc_gwangju' | 'km_crew'

export async function signUp(email: string, password: string, name: string, department: Department) {
  // 이메일 인증 후 리다이렉트 URL 설정
  // 운영 환경: https://kamo-cs-trainer.vercel.app/
  // 개발 환경: 현재 origin 사용
  const redirectUrl = 
    window.location.hostname === 'kamo-cs-trainer.vercel.app' 
      ? 'https://kamo-cs-trainer.vercel.app/'
      : window.location.origin + '/'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        name: name || email.split('@')[0],
        department,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * 이메일과 비밀번호로 로그인
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

/**
 * 현재 로그인한 사용자 정보 가져오기
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * 인증 상태 변경 감지
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}

import { getCurrentUserProfile } from './userManagement'

/**
 * 관리자 권한 확인 (클라이언트 측 간편 확인용)
 * 실제 보안은 DB RLS 정책으로 처리됨
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false
  
  // 1. 이메일 하드코딩 확인 (최우선 관리자)
  if (user.email === 'admin@test.com' || user.email === 'admin@example.com') return true
  
  // 2. 메타데이터 role 확인
  // 참고: 실제 권한은 DB의 profiles 테이블을 따르지만, 
  // UI 편의를 위해 로그인 시 메타데이터나 이메일로 1차 확인
  if (user.user_metadata?.role === 'admin') return true

  return false
}

/**
 * DB 기반으로 정확한 관리자 권한 확인 (비동기)
 */
export async function checkIsAdminDB(): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'admin'
}

