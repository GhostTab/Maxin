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

function ClientDetail({ client, policies, clientIndex, policyIndices, onBack, onEdit }) {
  const clientName = client?.col_1 || '—'

  return (
    <div className="page-content">
      <div className="detail-toolbar">
        <button type="button" onClick={onBack} className="btn btn-ghost">
          ← Back to list
        </button>
        <button type="button" onClick={onEdit} className="btn btn-primary">
          Edit
        </button>
      </div>
      <div className="card detail-card">
        <h3 className="card-title">Client</h3>
        <div className="detail-grid">
          {clientCols.map((col) => {
            const val = client[col.data] ?? '—'
            const isUpload = UPLOAD_FIELD_KEYS.Client_Info.includes(col.data)
            return (
              <div key={col.data} className="detail-field">
                <span className="detail-label">{col.title}</span>
                {isUpload && isUploadUrl(val) ? (
                  <a href={val} target="_blank" rel="noopener noreferrer" className="link-download">View / Download</a>
                ) : (
                  <span className="detail-value">{val}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <h3 className="section-title">Policies</h3>
      {policies.length === 0 ? (
        <p className="text-muted">No policies linked to this client.</p>
      ) : (
        <div className="policy-cards">
          {policies.map((policy, i) => (
            <div key={i} className="card detail-card">
              <div className="detail-grid">
                {policyCols.map((col) => {
                  const val = policy[col.data] ?? '—'
                  const isUpload = UPLOAD_FIELD_KEYS.Policy_Info.includes(col.data)
                  return (
                    <div key={col.data} className="detail-field">
                      <span className="detail-label">{col.title}</span>
                      {isUpload && isUploadUrl(val) ? (
                        <a href={val} target="_blank" rel="noopener noreferrer" className="link-download">View / Download</a>
                      ) : (
                        <span className="detail-value">{val}</span>
                      )}
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

function EditClientView({
  client,
  clientIndex,
  policies,
  policyIndices,
  clientInfo,
  policyInfo,
  onSave,
  onCancel,
}) {
  const [activeTab, setActiveTab] = useState('client')
  const [clientValues, setClientValues] = useState(() => ({ ...client }))
  const [policyValues, setPolicyValues] = useState(() => policies.map((p) => ({ ...p })))
  const [clientFiles, setClientFiles] = useState({})
  const [policyFiles, setPolicyFiles] = useState(() => policies.map(() => ({})))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const setClient = (key, value) => setClientValues((prev) => ({ ...prev, [key]: value }))
  const setClientFile = (key, file) => setClientFiles((prev) => ({ ...prev, [key]: file }))
  const setPolicyAt = (policyIdx, key, value) => {
    setPolicyValues((prev) => {
      const next = [...prev]
      next[policyIdx] = { ...next[policyIdx], [key]: value }
      return next
    })
  }
  const setPolicyFileAt = (policyIdx, key, file) => {
    setPolicyFiles((prev) => {
      const next = [...prev]
      next[policyIdx] = { ...next[policyIdx], [key]: file }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const clientRow = await buildRowWithUploads(
        clientCols,
        clientValues,
        clientFiles,
        UPLOAD_FIELD_KEYS.Client_Info,
        'kyc',
        supabase
      )
      const updatedPolicyInfo = [...policyInfo]
      for (let j = 0; j < policyIndices.length; j++) {
        const idx = policyIndices[j]
        const row = await buildRowWithUploads(
          policyCols,
          policyValues[j],
          policyFiles[j],
          UPLOAD_FIELD_KEYS.Policy_Info,
          'policy',
          supabase
        )
        updatedPolicyInfo[idx] = row
      }
      const newClientInfo = clientInfo.map((c, i) => (i === clientIndex ? clientRow : c))
      await saveCurrent(supabase, {
        client_info: newClientInfo,
        policy_info: updatedPolicyInfo,
      }, `Edited client: ${(clientValues.col_1 || '').trim() || 'Client'}`)
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
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          ← Cancel
        </button>
      </div>
      <h2 className="page-heading">Edit client & policies</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="add-record-tabs">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`add-record-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="add-record-panels">
          <div
            className={`add-record-panel ${activeTab === 'client' ? 'active' : ''}`}
            aria-hidden={activeTab !== 'client'}
          >
            <FormSection
              title="Client Information"
              columns={clientCols}
              values={clientValues}
              onChange={setClient}
              uploadFieldKeys={UPLOAD_FIELD_KEYS.Client_Info}
              files={clientFiles}
              onFileChange={setClientFile}
            />
          </div>
          <div
            className={`add-record-panel ${activeTab === 'policy' ? 'active' : ''}`}
            aria-hidden={activeTab !== 'policy'}
          >
            {policies.length === 0 ? (
              <p className="text-muted">No policies linked to this client.</p>
            ) : (
              policies.map((policy, j) => (
                <FormSection
                  key={j}
                  title={`Policy ${j + 1}`}
                  columns={policyCols}
                  values={policyValues[j] || {}}
                  onChange={(key, value) => setPolicyAt(j, key, value)}
                  uploadFieldKeys={UPLOAD_FIELD_KEYS.Policy_Info}
                  files={policyFiles[j] || {}}
                  onFileChange={(key, file) => setPolicyFileAt(j, key, file)}
                />
              ))
            )}
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default function DataManagement() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [editing, setEditing] = useState(false)
  const [downloading, setDownloading] = useState(false)

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
    ? clientInfo.filter(
        (c) =>
          (c.col_1 && String(c.col_1).toLowerCase().includes(filterLower)) ||
          (c.col_7 && String(c.col_7).toLowerCase().includes(filterLower)) ||
          (c.col_8 && String(c.col_8).toLowerCase().includes(filterLower))
      )
    : clientInfo
  const filteredIndices = filterLower
    ? clientInfo
        .map((c, i) => i)
        .filter((i) => {
          const c = clientInfo[i]
          return (
            (c.col_1 && String(c.col_1).toLowerCase().includes(filterLower)) ||
            (c.col_7 && String(c.col_7).toLowerCase().includes(filterLower)) ||
            (c.col_8 && String(c.col_8).toLowerCase().includes(filterLower))
          )
        })
    : clientInfo.map((_, i) => i)

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

  if (editing && selectedIndex != null && filteredClients[selectedIndex] != null) {
    const client = filteredClients[selectedIndex]
    const clientIndex = filteredIndices[selectedIndex]
    const clientName = client?.col_1 || ''
    const policyIndices = policyInfo
      .map((p, i) => i)
      .filter((i) => {
        const p = policyInfo[i]
        return (
          (p.col_1 && String(p.col_1).trim() === String(clientName).trim()) ||
          (p.col_2 && String(p.col_2).trim() === String(clientName).trim())
        )
      })
    const matchingPolicies = policyIndices.map((i) => policyInfo[i])
    return (
      <EditClientView
        client={client}
        clientIndex={clientIndex}
        policies={matchingPolicies}
        policyIndices={policyIndices}
        clientInfo={clientInfo}
        policyInfo={policyInfo}
        onSave={() => {
          setEditing(false)
          load()
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  if (selectedIndex != null && filteredClients[selectedIndex] != null && !editing) {
    const client = filteredClients[selectedIndex]
    const clientIndex = filteredIndices[selectedIndex]
    const clientName = client?.col_1 || ''
    const policyIndices = policyInfo
      .map((p, i) => i)
      .filter((i) => {
        const p = policyInfo[i]
        return (
          (p.col_1 && String(p.col_1).trim() === String(clientName).trim()) ||
          (p.col_2 && String(p.col_2).trim() === String(clientName).trim())
        )
      })
    const matchingPolicies = policyIndices.map((i) => policyInfo[i])
    return (
      <ClientDetail
        client={client}
        policies={matchingPolicies}
        clientIndex={clientIndex}
        policyIndices={policyIndices}
        onBack={() => setSelectedIndex(null)}
        onEdit={() => setEditing(true)}
      />
    )
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-heading">Data management</h2>
        <div className="page-actions">
          <input
            type="text"
            placeholder="Filter by name, email, or contact…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-search"
          />
          <button type="button" onClick={() => navigate('/add')} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconPlus />
            Add new record
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <IconDownload />
            {downloading ? 'Preparing…' : 'Download data'}
          </button>
        </div>
      </div>
      <p className="page-description">Click a client to view details and edit.</p>
      {filteredClients.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted">No clients yet. Add a record to get started.</p>
        </div>
      ) : (
        <div
          className="client-list"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)', // 4 columns
            gap: '16px', // space between cards
          }}
        >
          {filteredClients.map((client, i) => (
            <div
              key={filteredIndices[i]}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedIndex(i)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedIndex(i)}
              className="card client-card"
              style={{
                cursor: 'pointer',
              }}
            >
              <div className="client-card-name">{client.col_1 || '—'}</div>
              <div className="client-card-meta">
                {client.col_7 && `Email: ${client.col_7}`}
                {client.col_7 && client.col_8 && ' · '}
                {client.col_8 && `Contact: ${client.col_8}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}