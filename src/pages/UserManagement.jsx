import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listUsers, updateUserBan } from '../lib/adminUsers'

export default function UserManagement() {
  const navigate = useNavigate()
  const { isAdmin, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)

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

  const isBanned = (u) => {
    const until = u.banned_until
    if (!until) return false
    try {
      return new Date(until) > new Date()
    } catch {
      return true
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

      <div className="card">
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Users</h2>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : error ? (
          <p style={{ color: '#c53030' }}>{error}</p>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No users yet. Add a client from Add Client to create an account automatically.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const banned = isBanned(u)
                  const isCurrentUser = currentUser?.id === u.id
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px' }}>{u.email || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{u.role === 'admin' ? 'Admin' : 'Client'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 14 }}>
                        {banned ? 'Deactivated' : 'Active'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 14 }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {!isCurrentUser && u.role !== 'admin' && (
                          banned ? (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleReactivate(u.id)}
                            >
                              {actionLoadingId === u.id ? '…' : 'Reactivate'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleDeactivate(u.id)}
                            >
                              {actionLoadingId === u.id ? '…' : 'Deactivate'}
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
