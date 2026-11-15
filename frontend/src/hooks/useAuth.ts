import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Initial session load
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!error && data?.session) {
          setSession(data.session)
          setUser(data.session.user)
        }
      })
      .catch((err) => {
        console.warn('[useAuth] Could not retrieve session:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    // 2. Real-time auth state subscription (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      return await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || '',
          },
        },
      })
    },
    []
  )

  const resetPassword = useCallback(async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#reset-password`,
    })
  }, [])

  const signOut = useCallback(async () => {
    return await supabase.auth.signOut()
  }, [])

  return {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    resetPassword,
    signOut,
  }
}
