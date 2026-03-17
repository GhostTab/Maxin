/**
 * Admin-only: create user and list users via Edge Functions.
 * Requires session with app_metadata.role === 'admin'.
 * Uses fetch with explicit Authorization so the token is always sent.
 */

import { supabase } from './supabase'

const FUNCTIONS = {
  createUser: 'admin-create-user',
  listUsers: 'admin-list-users',
}

function getFunctionsUrl() {
  // In dev, use Vite proxy (same-origin) to avoid CORS preflight being blocked by Supabase
  if (import.meta.env.DEV) {
    return '/api/supabase-functions'
  }
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) return ''
  return base.replace(/\/$/, '') + '/functions/v1'
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated. Please log in again.')
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    ...(anonKey && { apikey: anonKey }),
  }
}

export async function createUser(email, password) {
  if (!supabase) throw new Error('Supabase not configured')
  const url = getFunctionsUrl()
  if (!url) throw new Error('VITE_SUPABASE_URL not set')
  const headers = await getAuthHeaders()
  const res = await fetch(`${url}/${FUNCTIONS.createUser}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: email.trim(), password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`
    if (res.status === 401) {
      throw new Error(`${msg} Log out and log back in if you were just set as admin.`)
    }
    throw new Error(msg)
  }
  return data
}

export async function listUsers(options = {}) {
  if (!supabase) throw new Error('Supabase not configured')
  const url = getFunctionsUrl()
  if (!url) throw new Error('VITE_SUPABASE_URL not set')
  const headers = await getAuthHeaders()
  const res = await fetch(`${url}/${FUNCTIONS.listUsers}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page: options.page ?? 1, per_page: options.per_page ?? 50 }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`
    if (res.status === 401) {
      throw new Error(`${msg} Log out and log back in if you were just set as admin.`)
    }
    throw new Error(msg)
  }
  return data
}
