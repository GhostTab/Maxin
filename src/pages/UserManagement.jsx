import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createUser, listUsers } from '../lib/adminUsers'

export default function UserManagement() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard', { replace: true })
      return
    }
    let mounted = true
    listUsers()
      .then((res) => {
        if (mounted) setUsers(res.users || [])
      })
      .catch((err) => {
        if (mounted) {
          const msg = err.message || 'Failed to load users'
          const isCors = /CORS|preflight|ERR_FAILED|Failed to fetch/i.test(msg) || (err?.message === 'Failed to fetch')
          setError(isCors
            ? 'Could not reach the user list (CORS). Deploy the Edge Functions with: npx supabase functions deploy admin-list-users --no-verify-jwt (and admin-create-user). See docs/USER-MANAGEMENT.md.'
            : msg)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [isAdmin, navigate])

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')
    if (password !== confirmPassword) {
      setCreateError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setCreateError('Password must be at least 6 characters')
      return
    }
    setCreateLoading(true)
    try {
      await createUser(email, password)
      setCreateSuccess(`Account created for ${email}. Share the login credentials with the client.`)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      const res = await listUsers()
      setUsers(res.users || [])
    } catch (err) {
      setCreateError(err.message || 'Failed to create user')
    } finally {
      setCreateLoading(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-heading">User management</h1>
          <p className="page-description">
            Create client accounts. Clients cannot register themselves; give them the email and password to sign in and view their own records.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Create client account</h2>
        <form onSubmit={handleCreate}>
          {createError && (
            <div style={{ marginBottom: 12, padding: 12, background: 'rgba(229,62,62,0.1)', color: '#c53030', borderRadius: 8, fontSize: 14 }}>
              {createError}
            </div>
          )}
          {createSuccess && (
            <div style={{ marginBottom: 12, padding: 12, background: 'rgba(72,187,120,0.15)', color: '#276749', borderRadius: 8, fontSize: 14 }}>
              {createSuccess}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--input-border)', fontSize: 15 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--input-border)', fontSize: 15 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Min 6 characters. Share this with the client.</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--input-border)', fontSize: 15 }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={createLoading}>
            {createLoading ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Existing users</h2>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : error ? (
          <p style={{ color: '#c53030' }}>{error}</p>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No users yet. Create a client account above.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px' }}>{u.email || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{u.role === 'admin' ? 'Admin' : 'Client'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 14 }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
