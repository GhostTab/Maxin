import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCurrentSubmission } from '../lib/submissions'
import { filterDataByClientEmail } from '../lib/filterClientData'

function IconUser({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconFile({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="client-section card">
      <div className="client-section-header">
        <Icon />
        <h2 className="client-section-title">{title}</h2>
      </div>
      <div className="client-section-body">{children}</div>
    </div>
  )
}

function Field({ label, value }) {
  const empty = value === null || value === undefined || String(value).trim() === ''
  return (
    <div className="client-field">
      <div className="client-field-label">{label}</div>
      <div className={empty ? 'client-field-value client-field-value-empty' : 'client-field-value'}>{empty ? '—' : value}</div>
    </div>
  )
}

function IconChevron({ size = 18, open }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`client-policy-chevron ${open ? 'is-open' : ''}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function PolicyCard({ policy, expanded, onToggle, detailsId }) {
  const status = (policy?.col_9 || '—').trim() || '—'
  const normalizedStatus = status.toLowerCase()
  const statusClass =
    normalizedStatus === 'active'
      ? 'client-policy-badge--active'
      : normalizedStatus === 'expired' || normalizedStatus === 'inactive' || normalizedStatus === 'cancelled'
        ? 'client-policy-badge--inactive'
        : 'client-policy-badge--neutral'
  const policyNum = policy?.col_3 || 'Policy'
  const provider = policy?.col_4 || '—'
  const line = policy?.col_5 || ''
  const expiry = policy?.col_8 || '—'
  return (
    <div className={`client-policy card ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="client-policy-summary"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        <div className="client-policy-summary-left">
          <IconChevron open={expanded} />
          <div>
            <span className="client-policy-title">{policyNum}</span>
            <span className="client-policy-meta">{provider}{line ? ` · ${line}` : ''}</span>
          </div>
        </div>
        <div className="client-policy-summary-right">
          <span className={`client-policy-badge ${statusClass}`}>{status}</span>
          <span className="client-policy-expiry">{expiry}</span>
        </div>
      </button>
      <div
        id={detailsId}
        className="client-policy-details"
        role="region"
        aria-hidden={!expanded}
      >
        <div className="client-policy-grid">
          <Field label="Insured name" value={policy?.col_2} />
          <Field label="Issued date" value={policy?.col_6} />
          <Field label="Inception date" value={policy?.col_7} />
          <Field label="Expiry date" value={policy?.col_8} />
          <Field label="Sum insured" value={policy?.col_10} />
          <Field label="Gross premium" value={policy?.col_11} />
          <Field label="Basic premium" value={policy?.col_12} />
          <Field label="Commission" value={policy?.col_13} />
          <Field label="Withholding tax" value={policy?.col_14} />
          <Field label="VAT" value={policy?.col_15} />
          <Field label="Discount" value={policy?.col_16} />
          <Field label="Net commission" value={policy?.col_17} />
        </div>
      </div>
    </div>
  )
}

export default function ClientHome() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [expandedPolicyIndex, setExpandedPolicyIndex] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    getCurrentSubmission()
      .then((current) => {
        if (!mounted) return
        const raw = current?.data || null
        const filtered = raw ? filterDataByClientEmail(raw, user?.email) : null
        setData(filtered)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e?.message || 'Failed to load your data.')
        setData(null)
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [user?.email])

  const myClient = useMemo(() => {
    const rows = Array.isArray(data?.client_info) ? data.client_info : []
    return rows[0] || null
  }, [data])

  const myPolicies = useMemo(() => {
    const rows = Array.isArray(data?.policy_info) ? data.policy_info : []
    return rows
  }, [data])

  const stats = useMemo(() => {
    const totalPolicies = myPolicies.length
    const activePolicies = myPolicies.filter((p) => String(p?.col_9 || '').trim().toLowerCase() === 'active').length
    const grossPremiumTotal = myPolicies.reduce((sum, p) => {
      const n = parseFloat(String(p?.col_11 || '').replace(/,/g, ''))
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
    return { totalPolicies, activePolicies, grossPremiumTotal }
  }, [myPolicies])

  const displayName = (myClient?.col_2 || myClient?.col_1 || user?.email || 'Client').toString()

  if (loading) {
    return (
      <div className="page-content">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="page-heading">My portal</h1>
            <p className="page-description">Your profile and policies.</p>
          </div>
        </div>
        <div className="loading-state">Loading…</div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="client-hero" style={{ marginBottom: 18 }}>
        <div className="client-hero-main">
          <p className="client-hero-eyebrow">Client portal</p>
          <h1 className="client-hero-title">Welcome, {displayName}</h1>
          <p className="client-hero-description">Track your profile and policies in one clean workspace.</p>
        </div>
        <div className="client-hero-pills">
          <span className="client-hero-pill">{stats.totalPolicies} policy{stats.totalPolicies === 1 ? '' : 'ies'}</span>
          <span className="client-hero-pill">{stats.activePolicies} active</span>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="client-kpis" style={{ marginBottom: 16 }}>
        <div className="client-kpi-card card">
          <span className="client-kpi-label">Total policies</span>
          <span className="client-kpi-value">{stats.totalPolicies}</span>
        </div>
        <div className="client-kpi-card card">
          <span className="client-kpi-label">Active policies</span>
          <span className="client-kpi-value">{stats.activePolicies}</span>
        </div>
        <div className="client-kpi-card card">
          <span className="client-kpi-label">Gross premium</span>
          <span className="client-kpi-value">
            {stats.grossPremiumTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="client-grid">
        <Section icon={IconUser} title="My profile">
          <div className="client-fields-grid">
            <Field label="Full name" value={myClient?.col_1} />
            <Field label="Email" value={myClient?.col_7 || user?.email} />
            <Field label="Phone" value={myClient?.col_8} />
            <Field label="Address" value={myClient?.col_9} />
            <Field label="Status" value={myClient?.col_17} />
          </div>
        </Section>

        <Section icon={IconFile} title="My policies">
          {myPolicies.length === 0 ? (
            <div className="empty-state">No policies found for your account.</div>
          ) : (
            <div className="client-policy-stack">
              {myPolicies.map((p, idx) => (
                <PolicyCard
                  key={p?.id || `${p?.col_3 || 'policy'}-${idx}`}
                  policy={p}
                  expanded={expandedPolicyIndex === idx}
                  onToggle={() => setExpandedPolicyIndex((prev) => (prev === idx ? null : idx))}
                  detailsId={`client-policy-details-${idx}`}
                />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

