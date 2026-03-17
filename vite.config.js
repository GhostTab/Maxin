import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  return {
    plugins: [react()],
    server: {
      proxy: supabaseUrl ? {
        // Avoid CORS in dev: call Edge Functions via same-origin so no preflight is blocked
        '/api/supabase-functions': {
          target: supabaseUrl,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/supabase-functions/, '/functions/v1'),
        },
      } : {},
    },
  }
})
