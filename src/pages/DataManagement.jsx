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

  const filterLower = filter.trim().toLowerCase()
  const filteredClients = filterLower
    ? clientInfo.filter(c =>
        (c.col_1 && c.col_1.toLowerCase().includes(filterLower)) ||
        (c.col_7 && c.col_7.toLowerCase().includes(filterLower)) ||
        (c.col_8 && c.col_8.toLowerCase().includes(filterLower))
      )
    : clientInfo
  const filteredPolicies = filterLower
    ? policyInfo.filter(p => {
        const clientName = clientInfo.find(c =>
          (p.col_1 && c.col_1 === p.col_1) ||
          (p.col_2 && c.col_1 === p.col_2)
        )?.col_1 || ''
        return clientName.toLowerCase().includes(filterLower)
      })
    : policyInfo

  const filteredClientIndices = filteredClients.map((_, i) => i)
  const filteredPolicyIndices = filteredPolicies.map((_, i) => i)

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
          <button type="button" onClick={() => navigate('/add')} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconPlus /> Add new record
          </button>
          <button type="button" onClick={handleDownload} disabled={downloading} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconDownload /> {downloading ? 'Preparing…' : 'Download data'}
          </button>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="section-toggle" style={{ marginBottom: 16 }}>
        <button type="button" className={`btn ${activeSection === 'client' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveSection('client')}>Client Information</button>
        <button type="button" className={`btn ${activeSection === 'policy' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveSection('policy')} style={{ marginLeft: 8 }}>Issued Policy Details</button>
      </div>

      {activeSection === 'client' ? (
        filteredClients.length === 0 ? <p className="text-muted">No clients found.</p> :
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            {filteredClients.map((client, i) => (
              <div key={filteredClientIndices[i]} role="button" tabIndex={0} onClick={() => setSelectedClientIndex(i)} onKeyDown={(e) => e.key === 'Enter' && setSelectedClientIndex(i)} className="card client-card" style={{ cursor: 'pointer' }}>
                <div className="client-card-name">{client.col_1 || '—'}</div>
                <div className="client-card-meta">
                  {client.col_7 && `Email: ${client.col_7}`}
                  {client.col_7 && client.col_8 && ' · '}
                  {client.col_8 && `Contact: ${client.col_8}`}
                </div>
              </div>
            ))}
          </div>
      ) : (
        filteredPolicies.length === 0 ? <p className="text-muted">No policies found.</p> :
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            {filteredPolicies.map((policy, i) => {
              const clientName = clientInfo.find(c =>
                (policy.col_1 && c.col_1 === policy.col_1) || (policy.col_2 && c.col_1 === policy.col_2)
              )?.col_1 || '—'

              return (
                <div key={i} role="button" tabIndex={0} onClick={() => setSelectedPolicyIndex(i)} onKeyDown={(e) => e.key === 'Enter' && setSelectedPolicyIndex(i)} className="card policy-card" style={{ cursor: 'pointer' }}>
                  <div className="policy-card-client">Client: {clientName}</div>
                  {policyCols.slice(0, 3).map(col => (
                    <div key={col.data} className="policy-field">
                      <span className="policy-label">{col.title}</span>
                      <span className="policy-value">{policy[col.data] || '—'}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
      )}
    </div>
  )
}
