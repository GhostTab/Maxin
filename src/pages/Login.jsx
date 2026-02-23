import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/Maxin logo.png'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
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
  
        {/* RIGHT SIDE - LOGIN FORM (NOW GRADIENT) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            background:
              'linear-gradient(160deg, #1a365d 0%, #2c5282 40%, #2b6cb0 100%)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              padding: 40,
              borderRadius: 16,

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
  
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.25)',
                  marginTop: 0,
                  marginBottom: 16,
                  fontSize: 16,
                  outline: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                }}
              />
  
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
          }
        `}
      </style>
    </div>
  )
}