import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listUsers, updateUserBan, createEmployeeAccount } from '../lib/adminUsers'

function roleLabel(role) {
  const normalized = String(role || '').trim().toLowerCase()
  if (normalized === 'admin') return 'Admin'
  if (normalized === 'employee') return 'Employee'
  return 'Client'
}

export default function UserManagement() {
  const navigate = useNavigate()
  const { isAdmin, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState(false)

  function loadUsers(silent = false) {
    if (!silent) setLoading(true)
    return listUsers()
      .then((res) => setUsers(res.users || []))
      .catch((err) => {
        const msg = err.message || 'Failed to load users'
        const isCors = /CORS|preflight|ERR_FAILED|Failed to fetch/i.test(msg) || (err?.message === 'Failed to fetch')
        setError(isCors
          ? 'Could not reach the user list (CORS). Deploy the Edge Functions with: npx supabase functions deploy admin-list-users --no-verify-jwt (and admin-update-user). See docs/USER-MANAGEMENT.md.'
          : msg)
      })
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard', { replace: true })
      return
    }
    loadUsers()
  }, [isAdmin, navigate])

  async function handleDeactivate(userId) {
    setActionLoadingId(userId)
    try {
      await updateUserBan(userId, '876000h')
      setError('')
      await loadUsers(true)
    } catch (err) {
      setError(err.message || 'Failed to deactivate user')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleReactivate(userId) {
    setActionLoadingId(userId)
    try {
      await updateUserBan(userId, 'none')
      setError('')
      await loadUsers(true)
    } catch (err) {
      setError(err.message || 'Failed to reactivate user')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleCreateEmployee(e) {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess(false)
    const name = createName.trim()
    const email = createEmail.trim()
    const password = createPassword
    if (!email || !password) {
      setCreateError('Email and password are required.')
      return
    }
    if (password.length < 6) {
      setCreateError('Password must be at least 6 characters.')
      return
    }
    setCreateLoading(true)
    try {
      await createEmployeeAccount(name || undefined, email, password)

      // Verify role assignment right away by reloading the admin user list.
      // If this still comes back as "Client", the backend edge function is likely not redeployed.
      const res = await listUsers()
      const created = (res.users || []).find((u) => String(u.email || '').toLowerCase() === email.toLowerCase())
      const createdRole = String(created?.role || '').trim().toLowerCase()
      if (createdRole !== 'employee') {
        setCreateError('Employee role was not set on the server. Please redeploy/update the `admin-create-user` Edge Function and try again.')
        setCreateSuccess(false)
        return
      }

      setCreateSuccess(true)
      setCreateName('')
      setCreateEmail('')
      setCreatePassword('')
      await loadUsers(true)
    } catch (err) {
      setCreateError(err.message || 'Failed to create employee account.')
    } finally {
      setCreateLoading(false)
    }
  }

  const isBanned = (u) => {
    const banDuration = u?.ban_duration
    if (banDuration && banDuration !== 'none') return true
    const until = u.banned_until
    if (!until) return false
    const d = new Date(until)
    if (Number.isNaN(d.getTime())) return true
    return d > new Date()
  }

  const getAccessStatus = (u) => {
    const untilRaw = u?.banned_until
    const banned = isBanned(u)
    if (!banned) return { key: 'active', label: 'Active', badge: 'active', hint: '' }

    let untilDate = null
    if (untilRaw) {
      const d = new Date(untilRaw)
      untilDate = Number.isNaN(d.getTime()) ? null : d
    }

    // We use a very long ban duration ("876000h" ≈ 100 years) for deactivation.
    // Treat far-future dates as "Deactivated" (admin-controlled) vs shorter bans as "Banned".
    const now = new Date()
    const yearsOut = untilDate ? (untilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365) : Number.POSITIVE_INFINITY
    const isDeactivated = yearsOut > 10

    if (isDeactivated) {
      return {
        key: 'deactivated',
        label: 'Deactivated',
        badge: 'inactive',
        hint: untilDate ? `Access blocked until ${untilDate.toLocaleDateString()}` : 'Access blocked',
      }
    }

    return {
      key: 'banned',
      label: 'Banned',
      badge: 'inactive',
      hint: untilDate ? `Banned until ${untilDate.toLocaleDateString()}` : 'Banned',
    }
  }

  if (!isAdmin) return null

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-heading">User management</h1>
          <p className="page-description">
            Client accounts are created automatically when you add a client in Add Client. This page is for viewing users and deactivating or reactivating access. Deleting users is disabled to keep client records linked; use Deactivate to block access.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title" style={{ marginBottom: 16 }}>Create Employee Account</h2>
        <p style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
          Only admins can create employee accounts. Role is set to Employee and cannot be changed by the employee.
        </p>
        <form onSubmit={handleCreateEmployee} className="page-content--form" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
          <div>
            <label htmlFor="emp-name" className="form-label">Name</label>
            <input
              id="emp-name"
              type="text"
              className="input"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="emp-email" className="form-label">Email <span style={{ color: 'var(--danger, #dc2626)' }}>*</span></label>
            <input
              id="emp-email"
              type="email"
              className="input"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="employee@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="emp-password" className="form-label">Password <span style={{ color: 'var(--danger, #dc2626)' }}>*</span></label>
            <input
              id="emp-password"
              type="password"
              className="input"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <span className="form-label">Role</span>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>Employee (pre-set)</p>
          </div>
          {createError && <div className="alert alert-error" style={{ margin: 0 }}>{createError}</div>}
          {createSuccess && <div className="alert" style={{ margin: 0, background: 'var(--primary-bg)', color: 'var(--primary)' }}>Employee account created successfully.</div>}
          <button type="submit" className="btn btn-primary" disabled={createLoading}>
            {createLoading ? 'Creating…' : 'Create Employee Account'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="card-title" style={{ margin: 0 }}>Users</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadUsers()}
            disabled={loading}
            aria-label="Refresh user list"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p className="loading-state">Loading…</p>
        ) : users.length === 0 ? (
          <p className="empty-state">No users yet. Add a client from Add Client to create an account automatically.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table" role="grid" aria-label="User list">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const status = getAccessStatus(u)
                  const isCurrentUser = currentUser?.id === u.id
                  return (
                    <tr key={u.id}>
                      <td>{u.email || '—'}</td>
                      <td>{roleLabel(u.role)}</td>
                      <td>
                        <span
                          className={`status-badge status-badge--${status.badge}`}
                          title={status.hint || status.label}
                        >
                          <span className={`status-dot status-dot--${status.badge}`} aria-hidden />
                          {status.label}
                        </span>
                      </td>
                      <td className="text-muted">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {!isCurrentUser && u.role !== 'admin' && (
                          status.key !== 'active' ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleReactivate(u.id)}
                              aria-label={`Reactivate ${u.email || 'user'}`}
                            >
                              {actionLoadingId === u.id ? 'Reactivating…' : 'Reactivate'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleDeactivate(u.id)}
                              aria-label={`Deactivate ${u.email || 'user'}`}
                            >
                              {actionLoadingId === u.id ? 'Deactivating…' : 'Deactivate'}
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
