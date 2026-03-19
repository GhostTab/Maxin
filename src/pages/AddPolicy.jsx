import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getCurrentSubmission, saveCurrent } from '../lib/submissions'
import { uploadFile } from '../lib/upload'
import { SPREADSHEET_COLUMNS, UPLOAD_FIELD_KEYS } from '../config/spreadsheetColumns'
import { FormWithSections } from '../components/RecordForm'

const policyCols = SPREADSHEET_COLUMNS.Policy_Info

function isFieldFilled(col, values, files, selectedClientName) {
  if (col.data === 'col_1' || col.data === 'col_2') {
    return !!selectedClientName
  }
  if (UPLOAD_FIELD_KEYS.Policy_Info.includes(col.data)) {
    return !!(files[col.data] || (values[col.data] != null && String(values[col.data]).trim() !== ''))
  }
  const v = values[col.data]
  return v != null && String(v).trim() !== ''
}

export default function AddPolicy() {
  const navigate = useNavigate()
  const { isStaff } = useAuth()
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [policyValues, setPolicyValues] = useState({})
  const [policyFiles, setPolicyFiles] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  /** Net commission = ((Commission - Withholding Tax + VAT) - Discount) */
  function calcNetCommission(vals) {
    const n = (key) => {
      const x = parseFloat(String((vals || {})[key] ?? '').replace(/,/g, ''))
      return Number.isFinite(x) ? x : 0
    }
    const commission = n('col_13')
    const withholdingTax = n('col_14')
    const vat = n('col_15')
    const discount = n('col_16')
    return ((commission - withholdingTax + vat) - discount)
  }

  const setPolicy = (key, value) => {
    setPolicyValues((prev) => {
      const next = { ...prev, [key]: value }
      if (['col_13', 'col_14', 'col_15', 'col_16'].includes(key)) {
        const net = calcNetCommission(next)
        next.col_17 = net.toFixed(2)
      }
      return next
    })
  }
  const setPolicyFile = (key, file) => setPolicyFiles((prev) => ({ ...prev, [key]: file }))

  useEffect(() => {
    if (!isStaff) navigate('/dashboard', { replace: true })
  }, [isStaff, navigate])

  if (!isStaff) return null

  useEffect(() => {
    let mounted = true
    getCurrentSubmission()
      .then((current) => {
        if (!mounted) return
        const data = current?.data || { client_info: [], policy_info: [] }
        const list = Array.isArray(data.client_info) ? data.client_info : []
        setClients(list)
        if (list.length > 0 && !selectedClientId) {
          setSelectedClientId(String(0))
        }
      })
      .catch(() => setClients([]))
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const selectedClient = clients[Number(selectedClientId)]
  const clientName = selectedClient ? (selectedClient.col_1 || '').trim() : ''
  const allPolicyFilled = policyCols.every((col) => isFieldFilled(col, policyValues, policyFiles, clientName))
  const formComplete = selectedClientId !== '' && clientName && allPolicyFilled

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!selectedClient) {
      setError('Please select a client. Add a client first if none exist.')
      return
    }
    if (!allPolicyFilled) {
      setError('Please fill in all policy fields.')
      return
    }
    setSubmitting(true)
    try {
      const current = await getCurrentSubmission()
      const data = current?.data || { client_info: [], policy_info: [] }
      const clientInfo = Array.isArray(data.client_info) ? data.client_info : []
      const policyInfo = Array.isArray(data.policy_info) ? data.policy_info : []

      const policyRow = {}
      for (const col of policyCols) {
        if (UPLOAD_FIELD_KEYS.Policy_Info.includes(col.data) && policyFiles[col.data]) {
          policyRow[col.data] = await uploadFile(supabase, 'policy', policyFiles[col.data])
        } else {
          policyRow[col.data] = policyValues[col.data] ?? ''
        }
      }
      policyRow.col_1 = clientName
      policyRow.col_2 = clientName

      await saveCurrent(supabase, {
        client_info: clientInfo,
        policy_info: [...policyInfo, policyRow],
      }, `Added policy for: ${clientName}`)

      setSuccess(true)
      setPolicyValues({})
      setPolicyFiles({})
      setTimeout(() => navigate('/data'), 1500)
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-state">Loading…</div>
      </div>
    )
  }

  return (
    <div className="page-content page-content--form">
      <h1 className="page-heading">Add policy</h1>
      <p className="page-description">Add a policy for an existing client. You must have at least one client before adding a policy.</p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success">Policy saved. Redirecting to Data management…</div>}

      {clients.length === 0 ? (
        <div className="card">
          <p className="text-muted" style={{ margin: 0 }}>
            No clients yet. Add a client first from <strong>Add client</strong>, then come back here to add a policy.
          </p>
          <button type="button" onClick={() => navigate('/add/client')} className="btn btn-primary" style={{ marginTop: 16 }}>
            Go to Add client
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-section-block">
              <h3 className="form-section-block-title">Link to client</h3>
              <p className="form-section-block-desc">
                Select the client this policy belongs to. Required.
              </p>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="input input-select"
                style={{ maxWidth: 400 }}
              >
                <option value="">Select client…</option>
                {clients.map((c, i) => (
                  <option key={i} value={i}>
                    {c.col_1 || '—'} {c.col_7 ? `(${c.col_7})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <FormWithSections
              sheetName="Policy_Info"
              values={policyValues}
              onChange={setPolicy}
              uploadFieldKeys={UPLOAD_FIELD_KEYS.Policy_Info}
              files={policyFiles}
              onFileChange={setPolicyFile}
            />

            <div className="form-actions">
              <button
                type="submit"
                disabled={submitting || !formComplete}
                className="btn btn-primary"
              >
                {submitting ? 'Saving…' : 'Save policy'}
              </button>
              <button type="button" onClick={() => navigate('/data')} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
