import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/Maxin logo.png'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(location.state?.message || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(err.message)
        return
      }
      navigate('/sheet', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#f7fafc',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          width: '100%',
        }}
      >
        {/* LEFT SIDE - BRANDING (NOW WHITE) */}
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
          <img
            src={logo}
            alt="MAXIN Logo"
            style={{
              width: 350,
              height: 'auto',
              marginBottom: 24,
            }}
          />
  
          <h1
            style={{
              fontSize: 34,
              margin: 0,
              fontWeight: 700,
              color: '#1a365d',
            }}
          >
            Insurance & Investment
          </h1>
  
          <p
            style={{
              marginTop: 12,
              fontSize: 16,
              color: '#718096',
            }}
          >
            Secure Admin Portal
          </p>
        </div>
  
        {/* RIGHT SIDE - IMAGE BG + BLUR LAYER + GLASS CARD */}
        <div
          className="login-right-column"
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
          {/* Blur overlay layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(26, 53, 93, 0.55)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          />
          {/* Smooth transition: white from left column fades into right (very subtle) */}
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
          {/* Glassy login card - centered in right column */}
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
            <h2
              style={{
                marginTop: 0,
                marginBottom: 0,
                paddingBottom: 0,
                fontSize: 38,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight:1
              }}
            >
              Welcome Back
            </h2>
  
            <p style={{ paddingTop: 0,marginTop: 0,marginBottom: 28, color: 'rgba(255,255,255,0.75)' }}>
              Sign in to continue
            </p>
  
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    background: 'rgba(255,99,99,0.15)',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 19,
                  }}
                >
                  {error}
                </div>
              )}
  
              <label
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                  
                }}
              >
                Email
              </label>
  
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.25)',
                  marginTop: 0,
                  marginBottom: 20,
                  fontSize: 16,
                  outline: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                }}
              />
  
              <label
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                Password
              </label>
  
              <div
                style={{
                  position: 'relative',
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.25)',
                    margin: 0,
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
  
              <p style={{ marginBottom: 16, marginTop: 0 }}>
                <Link
                  to="/forgot-password"
                  style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, textDecoration: 'underline' }}
                >
                  Forgot password?
                </Link>
              </p>
  
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-btn"
                  >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
          </div>
        </div>
      </div>
  
      <style>
        {`
          @media (max-width: 900px) {
            div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }
            .login-right-column {
              min-height: 60vh;
            }
          }
        `}
      </style>
    </div>
  )
}