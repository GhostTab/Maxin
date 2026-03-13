import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasValidConfig =
  typeof supabaseUrl === 'string' &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0

export const supabase = hasValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
