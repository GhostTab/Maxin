import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription?.unsubscribe()
  }, [])

  const user = session?.user ?? null
  const rawRole = user?.app_metadata?.role
  const normalizedRole = String(rawRole || '').trim().toLowerCase()
  const role = normalizedRole === 'admin' ? 'admin' : normalizedRole === 'employee' ? 'employee' : 'user'
  const isAdmin = role === 'admin'
  const isEmployee = role === 'employee'
  const isStaff = isAdmin || isEmployee
  const canAccessUserManagement = isAdmin
  const canDeleteClients = isAdmin
  const canDeletePolicies = isAdmin

  const value = {
    session,
    user,
    role,
    isAdmin,
    isEmployee,
    isStaff,
    canAccessUserManagement,
    canDeleteClients,
    canDeletePolicies,
    loading,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
