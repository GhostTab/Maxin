import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/Maxin logo.png'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })
      if (err) {
        setError(err.message)
        return
      }
      setSuccess(true)
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
        {/* LEFT - BRANDING */}
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
            style={{ width: 350, height: 'auto', marginBottom: 24 }}
          />
          <h1 style={{ fontSize: 34, margin: 0, fontWeight: 700, color: '#1a365d' }}>
            Insurance & Investment
          </h1>
          <p style={{ marginTop: 12, fontSize: 16, color: '#718096' }}>
            Secure Admin Portal
          </p>
        </div>

        {/* RIGHT - FORM */}
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
              Forgot password?
            </h2>
            <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.75)', fontSize: 15 }}>
              Enter the email address that is registered to your account. The reset link is sent only to that address—no one else can use it to change your password.
            </p>

            {success ? (
              <div
                style={{
                  marginBottom: 20,
                  padding: 14,
                  background: 'rgba(72, 187, 120, 0.2)',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 15,
                }}
              >
                If an account is registered with that email, we’ve sent a reset link to it. Check that inbox (and spam folder). The link works only from that email—no one else can complete the reset.
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
                  className="login-btn"
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
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}

            <p style={{ marginTop: 24, marginBottom: 0, textAlign: 'center' }}>
              <Link
                to="/login"
                style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, textDecoration: 'underline' }}
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
