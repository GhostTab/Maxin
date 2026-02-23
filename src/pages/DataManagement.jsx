import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentSubmission, saveCurrent } from '../lib/submissions'
import { exportCurrentToExcel } from '../lib/exportExcel'
import { uploadFile } from '../lib/upload'
import { SPREADSHEET_COLUMNS, UPLOAD_FIELD_KEYS } from '../config/spreadsheetColumns'
import { FormSection } from '../components/RecordForm'

const clientCols = SPREADSHEET_COLUMNS.Client_Info
const policyCols = SPREADSHEET_COLUMNS.Policy_Info

const TABS = [
  { id: 'client', label: 'Client Information' },
  { id: 'policy', label: 'Policy Information' },
]

function IconPlus({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconDownload({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconTrash({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function isUploadUrl(value) {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))
}

// ------------------------- CLIENT DETAIL -------------------------
function ClientDetail({ client, policies, clientIndex, policyIndices, onBack, onEdit }) {
  const clientName = client?.col_1 || '—'

  return (
    <div className="page-content">
      <div className="detail-toolbar">
        <button type="button" onClick={onBack} className="btn btn-ghost">← Back to list</button>
        <button type="button" onClick={onEdit} className="btn btn-primary">Edit</button>
      </div>

      <div className="card detail-card">
        <h3 className="card-title">Client</h3>
        <div className="detail-grid">
          {clientCols.map(col => {
            const val = client[col.data] ?? '—'
            const isUpload = UPLOAD_FIELD_KEYS.Client_Info.includes(col.data)
            return (
              <div key={col.data} className="detail-field">
                <span className="detail-label">{col.title}</span>
                {isUpload && isUploadUrl(val) ? (
                  <a href={val} target="_blank" rel="noopener noreferrer" className="link-download">View / Download</a>
                ) : <span className="detail-value">{val}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <h3 className="section-title">Policies</h3>
      {policies.length === 0 ? <p className="text-muted">No policies linked to this client.</p> : (
        <div className="policy-cards">
          {policies.map((policy, i) => (
            <div key={i} className="card detail-card">
              <div className="detail-grid">
                {policyCols.map(col => {
                  const val = policy[col.data] ?? '—'
                  const isUpload = UPLOAD_FIELD_KEYS.Policy_Info.includes(col.data)
                  return (
                    <div key={col.data} className="detail-field">
                      <span className="detail-label">{col.title}</span>
                      {isUpload && isUploadUrl(val) ? (
                        <a href={val} target="_blank" rel="noopener noreferrer" className="link-download">View / Download</a>
                      ) : <span className="detail-value">{val}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------- POLICY DETAIL -------------------------
function PolicyDetail({ policy, clientInfo, onBack }) {
  const clientName = clientInfo.find(c =>
    (policy.col_1 && c.col_1 === policy.col_1) ||
    (policy.col_2 && c.col_1 === policy.col_2)
  )?.col_1 || '—'

  return (
    <div className="page-content">
      <div className="detail-toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back to policies</button>
      </div>
      <div className="card detail-card">
        <h3 className="card-title">Policy for {clientName}</h3>
        <div className="detail-grid">
          {policyCols.map(col => {
            const val = policy[col.data] ?? '—'
            const isUpload = UPLOAD_FIELD_KEYS.Policy_Info.includes(col.data)
            return (
              <div key={col.data} className="detail-field">
                <span className="detail-label">{col.title}</span>
                {isUpload && isUploadUrl(val) ? (
                  <a href={val} target="_blank" rel="noopener noreferrer" className="link-download">View / Download</a>
                ) : <span className="detail-value">{val}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ------------------------- BUILD ROW WITH UPLOADS -------------------------
async function buildRowWithUploads(cols, values, files, uploadKeys, bucket, supabaseClient) {
  const row = {}
  for (const col of cols) {
    if (uploadKeys.includes(col.data) && files[col.data]) {
      row[col.data] = await uploadFile(supabaseClient, bucket, files[col.data])
    } else {
      row[col.data] = values[col.data] ?? ''
    }
  }
  return row
}

// ------------------------- EDIT CLIENT VIEW -------------------------
function EditClientView({ client, clientIndex, policies, policyIndices, clientInfo, policyInfo, onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState('client')
  const [clientValues, setClientValues] = useState({ ...client })
  const [policyValues, setPolicyValues] = useState(policies.map(p => ({ ...p })))
  const [clientFiles, setClientFiles] = useState({})
  const [policyFiles, setPolicyFiles] = useState(policies.map(() => ({})))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const setClient = (key, value) => setClientValues(prev => ({ ...prev, [key]: value }))
  const setClientFile = (key, file) => setClientFiles(prev => ({ ...prev, [key]: file }))
  const setPolicyAt = (idx, key, value) => {
    setPolicyValues(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }
  const setPolicyFileAt = (idx, key, file) => {
    setPolicyFiles(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: file }
      return next
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const clientRow = await buildRowWithUploads(clientCols, clientValues, clientFiles, UPLOAD_FIELD_KEYS.Client_Info, 'kyc', supabase)
      const updatedPolicyInfo = [...policyInfo]
      for (let j = 0; j < policyIndices.length; j++) {
        const row = await buildRowWithUploads(policyCols, policyValues[j], policyFiles[j], UPLOAD_FIELD_KEYS.Policy_Info, 'policy', supabase)
        updatedPolicyInfo[policyIndices[j]] = row
      }
      const newClientInfo = clientInfo.map((c, i) => (i === clientIndex ? clientRow : c))
      await saveCurrent(supabase, { client_info: newClientInfo, policy_info: updatedPolicyInfo }, `Edited client: ${(clientValues.col_1 || '').trim() || 'Client'}`)
      onSave()
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-content">
      <div className="detail-toolbar">
        <button type="button" onClick={onCancel} className="btn btn-ghost">← Cancel</button>
      </div>
      <h2 className="page-heading">Edit Client & Policies</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="add-record-tabs">
          {TABS.map(({ id, label }) => (
            <button key={id} type="button" className={`add-record-tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="add-record-panels">
          {activeTab === 'client' && (
            <FormSection
              title="Client Information"
              columns={clientCols}
              values={clientValues}
              onChange={setClient}
              uploadFieldKeys={UPLOAD_FIELD_KEYS.Client_Info}
              files={clientFiles}
              onFileChange={setClientFile}
            />
          )}
          {activeTab === 'policy' && policies.map((policy, i) => (
            <FormSection
              key={i}
              title={`Policy ${i + 1}`}
              columns={policyCols}
              values={policyValues[i] || {}}
              onChange={(key, value) => setPolicyAt(i, key, value)}
              uploadFieldKeys={UPLOAD_FIELD_KEYS.Policy_Info}
              files={policyFiles[i] || {}}
              onFileChange={(key, file) => setPolicyFileAt(i, key, file)}
            />
          ))}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Saving…' : 'Save changes'}</button>
          <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}

// ------------------------- DATA MANAGEMENT -------------------------
export default function DataManagement() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [selectedClientIndex, setSelectedClientIndex] = useState(null)
  const [selectedPolicyIndex, setSelectedPolicyIndex] = useState(null)
  const [editing, setEditing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [activeSection, setActiveSection] = useState('client') // client or policy
  const [selectedClientIndices, setSelectedClientIndices] = useState(() => new Set())
  const [selectedPolicyIndices, setSelectedPolicyIndices] = useState(() => new Set())
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getCurrentSubmission()
      setCurrent(data)
    } catch (err) {
      setError(err.message || 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const data = await getCurrentSubmission()
      exportCurrentToExcel(data)
    } catch (err) {
      setError(err.message || 'Failed to download.')
    } finally {
      setDownloading(false)
    }
  }

  const clientInfo = current?.data?.client_info ?? []
  const policyInfo = current?.data?.policy_info ?? []

  const toggleClientSelection = (realIndex) => {
    setSelectedClientIndices((prev) => {
      const next = new Set(prev)
      if (next.has(realIndex)) next.delete(realIndex)
      else next.add(realIndex)
      return next
    })
  }

  const togglePolicySelection = (realIndex) => {
    setSelectedPolicyIndices((prev) => {
      const next = new Set(prev)
      if (next.has(realIndex)) next.delete(realIndex)
      else next.add(realIndex)
      return next
    })
  }

  const deleteClientsAndLinkedPolicies = async (clientIndicesToDelete) => {
    const namesToRemove = new Set(
      clientInfo.filter((_, i) => clientIndicesToDelete.has(i)).map((c) => (c.col_1 || '').trim()).filter(Boolean)
    )
    const newClientInfo = clientInfo.filter((_, i) => !clientIndicesToDelete.has(i))
    const newPolicyInfo = policyInfo.filter((p) => {
      const name1 = (p.col_1 || '').trim()
      const name2 = (p.col_2 || '').trim()
      const linkedToDeleted = (name1 && namesToRemove.has(name1)) || (name2 && namesToRemove.has(name2))
      return !linkedToDeleted
    })
    await saveCurrent(supabase, { client_info: newClientInfo, policy_info: newPolicyInfo }, 'Deleted client(s)')
  }

  const handleDeleteOneClient = async (realIndex) => {
    if (!window.confirm('Are you sure you want to delete this client? This will also remove their linked policies.')) return
    setDeleting(true)
    setError('')
    try {
      await deleteClientsAndLinkedPolicies(new Set([realIndex]))
      setSelectedClientIndices((prev) => {
        const next = new Set(prev)
        next.delete(realIndex)
        return next
      })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteOnePolicy = async (realIndex) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) return
    setDeleting(true)
    setError('')
    try {
      const newPolicyInfo = policyInfo.filter((_, i) => i !== realIndex)
      await saveCurrent(supabase, { client_info: clientInfo, policy_info: newPolicyInfo }, 'Deleted policy')
      setSelectedPolicyIndices((prev) => {
        const next = new Set(prev)
        next.delete(realIndex)
        return next
      })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSelectedClients = async () => {
    if (selectedClientIndices.size === 0) return
    if (!window.confirm(`Are you sure you want to delete ${selectedClientIndices.size} selected client(s)? This will also remove their linked policies.`)) return
    setDeleting(true)
    setError('')
    try {
      await deleteClientsAndLinkedPolicies(selectedClientIndices)
      setSelectedClientIndices(new Set())
      await load()
    } catch (err) {
      setError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSelectedPolicies = async () => {
    if (selectedPolicyIndices.size === 0) return
    if (!window.confirm(`Are you sure you want to delete ${selectedPolicyIndices.size} selected policy(ies)?`)) return
    setDeleting(true)
    setError('')
    try {
      const newPolicyInfo = policyInfo.filter((_, i) => !selectedPolicyIndices.has(i))
      await saveCurrent(supabase, { client_info: clientInfo, policy_info: newPolicyInfo }, 'Deleted selected policies')
      setSelectedPolicyIndices(new Set())
      await load()
    } catch (err) {
      setError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const filterLower = filter.trim().toLowerCase()
  let filteredClients, filteredClientIndices
  if (filterLower) {
    filteredClientIndices = []
    filteredClients = clientInfo.filter((c, idx) => {
      const match =
        (c.col_1 && c.col_1.toLowerCase().includes(filterLower)) ||
        (c.col_7 && c.col_7.toLowerCase().includes(filterLower)) ||
        (c.col_8 && c.col_8.toLowerCase().includes(filterLower))
      if (match) filteredClientIndices.push(idx)
      return match
    })
  } else {
    filteredClients = clientInfo
    filteredClientIndices = clientInfo.map((_, i) => i)
  }

  let filteredPolicies, filteredPolicyIndices
  if (filterLower) {
    filteredPolicyIndices = []
    filteredPolicies = policyInfo.filter((p, idx) => {
      const clientName = clientInfo.find(c =>
        (p.col_1 && c.col_1 === p.col_1) ||
        (p.col_2 && c.col_1 === p.col_2)
      )?.col_1 || ''
      const match = clientName.toLowerCase().includes(filterLower)
      if (match) filteredPolicyIndices.push(idx)
      return match
    })
  } else {
    filteredPolicies = policyInfo
    filteredPolicyIndices = policyInfo.map((_, i) => i)
  }

  // ------------------ Editing / Detail Views ------------------
  if (editing && selectedClientIndex != null && filteredClients[selectedClientIndex]) {
    const client = filteredClients[selectedClientIndex]
    const clientIndex = filteredClientIndices[selectedClientIndex]
    const clientName = client?.col_1 || ''
    const policyIndices = policyInfo.map((p, i) => i).filter(i => {
      const p = policyInfo[i]
      return (p.col_1 && String(p.col_1).trim() === clientName.trim()) || (p.col_2 && String(p.col_2).trim() === clientName.trim())
    })
    const matchingPolicies = policyIndices.map(i => policyInfo[i])
    return (
      <EditClientView
        client={client}
        clientIndex={clientIndex}
        policies={matchingPolicies}
        policyIndices={policyIndices}
        clientInfo={clientInfo}
        policyInfo={policyInfo}
        onSave={() => { setEditing(false); load() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  if (selectedClientIndex != null && filteredClients[selectedClientIndex] && !editing) {
    const client = filteredClients[selectedClientIndex]
    const clientIndex = filteredClientIndices[selectedClientIndex]
    const clientName = client?.col_1 || ''
    const policyIndices = policyInfo.map((p, i) => i).filter(i => {
      const p = policyInfo[i]
      return (p.col_1 && String(p.col_1).trim() === clientName.trim()) || (p.col_2 && String(p.col_2).trim() === clientName.trim())
    })
    const matchingPolicies = policyIndices.map(i => policyInfo[i])
    return (
      <ClientDetail
        client={client}
        policies={matchingPolicies}
        clientIndex={clientIndex}
        policyIndices={policyIndices}
        onBack={() => setSelectedClientIndex(null)}
        onEdit={() => setEditing(true)}
      />
    )
  }

  if (selectedPolicyIndex != null) {
    return (
      <PolicyDetail
        policy={filteredPolicies[selectedPolicyIndex]}
        clientInfo={clientInfo}
        onBack={() => setSelectedPolicyIndex(null)}
      />
    )
  }

// ------------------ Main List ------------------
return (
  <div className="page-content">
    {error && (
      <div className="alert alert-error" style={{ marginBottom: 16 }}>
        {error}
      </div>
    )}
    <div className="page-header">
      <h2 className="page-heading">Data Management</h2>
      <div className="page-actions">
        <input
          type="text"
          placeholder="Filter by name, email, or contact…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-search"
        />

        <button
          type="button"
          onClick={() => navigate('/add')}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <IconPlus /> Add new record
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <IconDownload /> {downloading ? 'Preparing…' : 'Download data'}
        </button>

        {activeSection === 'client' && selectedClientIndices.size > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelectedClients}
            disabled={deleting}
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#b91c1c',
              color: '#fff',
              border: 'none',
            }}
          >
            <IconTrash size={16} /> Delete selected ({selectedClientIndices.size})
          </button>
        )}
        {activeSection === 'policy' && selectedPolicyIndices.size > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelectedPolicies}
            disabled={deleting}
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#b91c1c',
              color: '#fff',
              border: 'none',
            }}
          >
            <IconTrash size={16} /> Delete selected ({selectedPolicyIndices.size})
          </button>
        )}
      </div>
    </div>

    {/* Section Toggle */}
    <div className="section-toggle" style={{ marginBottom: 16 }}>
      <button
        type="button"
        className={`btn ${
          activeSection === 'client' ? 'btn-primary' : 'btn-ghost'
        }`}
        onClick={() => {
          setActiveSection('client')
          setSelectedPolicyIndices(new Set())
        }}
      >
        Client Information
      </button>

      <button
        type="button"
        className={`btn ${
          activeSection === 'policy' ? 'btn-primary' : 'btn-ghost'
        }`}
        onClick={() => {
          setActiveSection('policy')
          setSelectedClientIndices(new Set())
        }}
        style={{ marginLeft: 8 }}
      >
        Issued Policy Details
      </button>
    </div>

    {/* ================= CLIENT CARDS ================= */}
    {activeSection === 'client' ? (
      filteredClients.length === 0 ? (
        <p className="text-muted">No clients found.</p>
      ) : (
        <div
          className="grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: '16px',
          }}
        >
          {filteredClients.map((client, i) => {
            const realIndex = filteredClientIndices[i]
            const isSelected = selectedClientIndices.has(realIndex)
            return (
              <div
                key={realIndex}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedClientIndex(i)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && setSelectedClientIndex(i)
                }
                className="card client-card"
                style={{
                  cursor: 'pointer',
                  padding: 16,
                  position: 'relative',
                  outline: isSelected ? '2px solid var(--maxin-light)' : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleClientSelection(realIndex)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${client.col_1 || 'client'}`}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 12,
                    width: 18,
                    height: 18,
                    cursor: 'pointer',
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteOneClient(realIndex)
                  }}
                  disabled={deleting}
                  aria-label="Delete client"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    padding: 4,
                    border: 'none',
                    background: 'transparent',
                    color: '#6b7280',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#b91c1c'
                    e.currentTarget.style.background = '#fef2f2'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6b7280'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <IconTrash size={18} />
                </button>
                {/* Full Name */}
                <div style={{ fontWeight: 'bold', fontSize: '1.25rem', paddingLeft: 28, paddingRight: 36 }}>
                  {client.col_1 || '—'}
                </div>

                {/* Status */}
                <div style={{ marginTop: 6, color: '#555' }}>
                  {client.col_2 || '—'}
                </div>
              </div>
            )
          })}
        </div>
      )
    ) : filteredPolicies.length === 0 ? (
      <p className="text-muted">No policies found.</p>
    ) : (
      /* ================= POLICY CARDS ================= */
      <div
        className="grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: '16px',
        }}
      >
        {filteredPolicies.map((policy, i) => {
          const realIndex = filteredPolicyIndices[i]
          const isSelected = selectedPolicyIndices.has(realIndex)
          const insuredName = policy.col_2 || '—' // insured name
          const insuranceLine = policy.col_5 || '—'
          const policyNumber = policy.col_3 || '—'
          const status = policy.col_9 || '—'
          const provider = policy.col_4 || '—'

          return (
            <div
              key={realIndex}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPolicyIndex(i)}
              onKeyDown={(e) =>
                e.key === 'Enter' && setSelectedPolicyIndex(i)
              }
              className="card policy-card"
              style={{
                cursor: 'pointer',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                minHeight: 160,
                position: 'relative',
                outline: isSelected ? '2px solid var(--maxin-light)' : undefined,
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => togglePolicySelection(realIndex)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select policy ${policyNumber}`}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 12,
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                  zIndex: 1,
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteOnePolicy(realIndex)
                }}
                disabled={deleting}
                aria-label="Delete policy"
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 12,
                  padding: 4,
                  border: 'none',
                  background: 'transparent',
                  color: '#6b7280',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#b91c1c'
                  e.currentTarget.style.background = '#fef2f2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6b7280'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <IconTrash size={18} />
              </button>
              {/* Insurance Line (BOLD) */}
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  marginBottom: 0,
                  paddingLeft: 28,
                  paddingRight: 36,
                }}
              >
                {insuranceLine}
              </div>

              {/* Policy Number */}
              <div style={{ color: '#444' }}>
                {policyNumber}
              </div>

              {/* Insured Name (BOLD) */}
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                  marginTop: 12,
                  marginBottom: 0,
                }}
              >
                {insuredName}
              </div>

              {/* Status */}
              <div style={{ color: '#555', marginBottom: 16, }}>
                {status}
              </div>

              {/* Provider (Bottom) */}
              <div
                style={{
                  marginTop: 'auto',
                  color: '#666',
                  fontSize: '0.9rem',
                }}
              >
                {provider}
              </div>
            </div>
          )
        })}
      </div>
    )}
  </div>
)
}