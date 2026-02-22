import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentSubmission, getHistorySubmissions, revertToVersion, MAX_HISTORY } from '../lib/submissions'

export default function Submissions() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revertingId, setRevertingId] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [currentRow, historyRows] = await Promise.all([
        getCurrentSubmission(),
        getHistorySubmissions(),
      ])
      setCurrent(currentRow)
      setHistory(historyRows)
    } catch (err) {
      const msg = err?.message || String(err)
      const hint = (msg.includes('submissions') || msg.includes('400') || msg.includes('relation') || msg.includes('column'))
        ? ' Run supabase-schema.sql in your Supabase project SQL Editor if you haven’t, and ensure you’re logged in.'
        : ''
      setError(msg + hint)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRevert(versionId) {
    setRevertingId(versionId)
    setError('')
    try {
      await revertToVersion(supabase, versionId)
      await load()
      navigate('/sheet', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setRevertingId(null)
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-state">Loading…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="page-content">
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  const dataSummary = (data) => {
    if (!data || typeof data !== 'object') return '—'
    const c = (data.client_info || []).length
    const p = (data.policy_info || []).length
    return `Client: ${c}, Policy: ${p}`
  }

  return (
    <div className="page-content">
      <h2 className="page-heading">Version history</h2>
      <p className="page-description">
        Only the last {MAX_HISTORY} saves are kept. When you save again, the oldest is permanently deleted. Reverting restores that version as current.
      </p>

      {current && (
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderColor: 'var(--maxin-light)' }}>
          <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Current version (saved &amp; synced)</strong>
          <div style={{ marginTop: 8, fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{current.message || '— No commit message'}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>{new Date(current.submitted_at).toLocaleString()}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: 'var(--text-secondary)' }}>{dataSummary(current.data)}</div>
        </div>
      )}

      <h3 className="section-title">Previous versions (revert to one of these)</h3>
      {history.length === 0 ? (
        <p className="text-muted">No previous versions yet. Save changes to create history.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((row) => (
            <li key={row.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{row.message || '— No commit message'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(row.submitted_at).toLocaleString()}</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dataSummary(row.data)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRevert(row.id)}
                disabled={revertingId != null}
                className="btn btn-primary"
              >
                {revertingId === row.id ? 'Reverting…' : 'Revert to this version'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
