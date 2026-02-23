import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/Maxin logo.png'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setRecoveryReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION') {
        setRecoveryReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError(err.message)
        return
      }
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } finally {
      setLoading(false)
    }
  }

  if (!recoveryReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: '#64748b', marginBottom: 16 }}>Checking your reset link…</p>
          <p style={{ fontSize: 14, color: '#94a3b8' }}>
            If you weren’t redirected from the email link, <a href="/login">go to sign in</a>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f7fafc' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 60,
            background: '#ffffff',
          }}
        >
          <img src={logo} alt="MAXIN Logo" style={{ width: 350, height: 'auto', marginBottom: 24 }} />
          <h1 style={{ fontSize: 34, margin: 0, fontWeight: 700, color: '#1a365d' }}>
            Insurance & Investment
          </h1>
          <p style={{ marginTop: 12, fontSize: 16, color: '#718096' }}>Secure Admin Portal</p>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            backgroundImage: 'url(/login-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(26, 53, 93, 0.55)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 'min(40px, 4%)',
              background: 'linear-gradient(to right, #ffffff 0%, rgba(255,255,255,0.35) 45%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              maxWidth: 440,
              padding: '40px 36px',
              borderRadius: 20,
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#ffffff' }}>
              Set new password
            </h2>
            <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.75)', fontSize: 15 }}>
              Enter your new password below.
            </p>

            {success ? (
              <div
                style={{
                  padding: 14,
                  background: 'rgba(72, 187, 120, 0.2)',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 15,
                }}
              >
                Password updated. Redirecting to sign in…
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      background: 'rgba(255,99,99,0.2)',
                      color: '#fff',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </div>
                )}
                <label style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                  New password
                </label>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '12px 44px 12px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.25)',
                      marginTop: 4,
                      fontSize: 16,
                      outline: 'none',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 6,
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <label style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.25)',
                    marginTop: 4,
                    marginBottom: 20,
                    fontSize: 16,
                    outline: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: '#ffffff',
                    color: '#1a365d',
                  }}
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
