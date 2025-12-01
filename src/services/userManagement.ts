import { supabase } from './supabase'

export interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
}

/**
 * 모든 사용자 프로필 목록 가져오기 (관리자 전용)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data as UserProfile[]
}

/**
 * 사용자 권한 변경하기 (관리자 전용)
 */
export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`)
  }
}

/**
 * 현재 사용자의 프로필(권한 포함) 가져오기
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }

  return data as UserProfile
}

