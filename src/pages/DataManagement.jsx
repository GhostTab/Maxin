import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getCurrentSubmission, saveCurrent } from '../lib/submissions'
import { downloadFile } from '../lib/downloadFile'
import { uploadFile } from '../lib/upload'
import { SPREADSHEET_COLUMNS, UPLOAD_FIELD_KEYS, STATUS_OPTIONS } from '../config/spreadsheetColumns'
import { FormWithSections, SearchInput, FileActionButtons } from '../components/RecordForm'

const clientCols = SPREADSHEET_COLUMNS.Client_Info
const policyCols = SPREADSHEET_COLUMNS.Policy_Info

function IconPlus({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function IconGrid({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconList({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconPhone({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IconMapPin({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconFileText({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function IconUser({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconShield({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function isUploadUrl(value) {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))
}

/** Safe filename segment: replace spaces and invalid chars with dash */
function safeFilenameSegment(name) {
  return (name || 'file').replace(/\s+/g, '-').replace(/[\/:*?"<>|]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file'
}

function handleDownloadFile(url, suggestedName, onError) {
  downloadFile(url, suggestedName).catch((err) => {
    if (onError) onError(err.message)
    else alert('Download failed: ' + (err.message || 'Unknown error'))
  })
}

// ------------------------- VIEW SECTION ICONS -------------------------
function IconUserCircle({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconContact({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      <path d="M15 10l-4 4" />
      <path d="M9 10l4 4" transform="rotate(90 11 12)" />
    </svg>
  )
}

function IconHome({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconFile({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function IconChevronDown({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconDollar({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

// ------------------------- VIEW FIELD COMPONENT -------------------------
function ViewField({ label, value, isEmpty }) {
  return (
    <div className="view-field">
      <span className="view-field-label">{label}</span>
      <span className={isEmpty ? 'view-field-value view-field-value-empty' : 'view-field-value'}>
        {isEmpty ? '—' : value}
      </span>
    </div>
  )
}

// ------------------------- VIEW SECTION COMPONENT -------------------------
function ViewSection({ icon: Icon, title, children }) {
  return (
    <div className="view-section-card">
      <div className="view-section-header">
        <Icon className="view-section-icon" />
        <h3 className="view-section-title">{title}</h3>
      </div>
      <div className="view-fields-grid">
        {children}
      </div>
    </div>
  )
}

// ------------------------- POLICY ACCORDION COMPONENT -------------------------
function PolicyAccordion({ policy, policyIndex, clientName }) {
  const [expanded, setExpanded] = useState(false)
  const policyNumber = policy.col_3 || '—'
  const provider = policy.col_4 || '—'
  const status = policy.col_9 || '—'
  const expiryDate = policy.col_8 || '—'

  // Summary fields for the header
  const sumInsured = policy.col_10 || '—'
  const grossPremium = policy.col_11 || '—'

  return (
    <div className="accordion-item">
      <button
        type="button"
        className="accordion-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="accordion-header-content">
          <IconFile className="accordion-icon" size={18} />
          <span>Policy {policyIndex + 1}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)', marginLeft: 8 }}>
            {policyNumber}
          </span>
          <div className="accordion-summary">
            <span className="accordion-summary-item">{provider}</span>
            <span className="accordion-summary-badge">{status}</span>
          </div>
        </div>
        <IconChevronDown className={`accordion-chevron ${expanded ? 'expanded' : ''}`} />
      </button>

      <div className={`accordion-content ${expanded ? 'expanded' : ''}`}>
        {/* Policy Details Section */}
        <ViewSection icon={IconFile} title="Policy Details">
          <ViewField label="Policy Number" value={policy.col_3} isEmpty={!policy.col_3} />
          <ViewField label="Insured Name" value={policy.col_2} isEmpty={!policy.col_2} />
          <ViewField label="Provider" value={policy.col_4} isEmpty={!policy.col_4} />
          <ViewField label="Line" value={policy.col_5} isEmpty={!policy.col_5} />
          <ViewField label="Issued Date" value={policy.col_6} isEmpty={!policy.col_6} />
          <ViewField label="Inception Date" value={policy.col_7} isEmpty={!policy.col_7} />
          <ViewField label="Expiry Date" value={policy.col_8} isEmpty={!policy.col_8} />
          <ViewField label="Status" value={policy.col_9} isEmpty={!policy.col_9} />
        </ViewSection>

        {/* Financial Section */}
        <ViewSection icon={IconDollar} title="Financial Information">
          <ViewField label="Sum Insured" value={policy.col_10} isEmpty={!policy.col_10} />
          <ViewField label="Gross Premium" value={policy.col_11} isEmpty={!policy.col_11} />
          <ViewField label="Basic Premium" value={policy.col_12} isEmpty={!policy.col_12} />
          <ViewField label="Commission" value={policy.col_13} isEmpty={!policy.col_13} />
          <ViewField label="Withholding Tax" value={policy.col_14} isEmpty={!policy.col_14} />
          <ViewField label="VAT" value={policy.col_15} isEmpty={!policy.col_15} />
          <ViewField label="Discount" value={policy.col_16} isEmpty={!policy.col_16} />
          <ViewField label="Net Commission" value={policy.col_17} isEmpty={!policy.col_17} />
        </ViewSection>

        {/* Upload Section */}
        {isUploadUrl(policy.col_18) && (
          <div style={{ marginTop: 16 }}>
            <span className="view-field-label" style={{ display: 'block', marginBottom: 8 }}>Policy Copy</span>
            <FileActionButtons
              fileUrl={policy.col_18}
              downloadFilename={`${safeFilenameSegment(policyNumber)}-PolicyCopy`}
              onDownload={(url, name) => handleDownloadFile(url, name)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ------------------------- CLIENT DETAIL -------------------------
function ClientDetail({ client, policies, clientIndex, policyIndices, onBack, onEdit }) {
  const clientName = client?.col_1 || '—'

  return (
    <div className="view-page-content">
      {/* Toolbar */}
      <div className="view-toolbar">
        <div className="view-toolbar-left">
          <button type="button" onClick={onBack} className="btn btn-secondary">← Back to list</button>
        </div>
        <button type="button" onClick={onEdit} className="btn btn-primary">Edit client</button>
      </div>

      {/* Page Title */}
      <h1 className="page-heading" style={{ marginBottom: 8 }}>{clientName}</h1>
      <p className="page-description" style={{ marginBottom: 32 }}>
        Client details and linked policies
      </p>

      {/* Side-by-Side Layout */}
      <div className="side-by-side-layout">
        {/* Client Information Column */}
        <div>
          {/* Identity Section */}
          <ViewSection icon={IconUserCircle} title="Identity Information">
            <ViewField label="Full Name" value={client.col_1} isEmpty={!client.col_1} />
            <ViewField label="First Name" value={client.col_2} isEmpty={!client.col_2} />
            <ViewField label="Middle Name" value={client.col_3} isEmpty={!client.col_3} />
            <ViewField label="Last Name" value={client.col_4} isEmpty={!client.col_4} />
            <ViewField label="Suffix" value={client.col_5} isEmpty={!client.col_5} />
            <ViewField label="TIN" value={client.col_6} isEmpty={!client.col_6} />
            <ViewField label="Birthday" value={client.col_9} isEmpty={!client.col_9} />
            <ViewField label="Birth Place" value={client.col_10} isEmpty={!client.col_10} />
            <ViewField label="Nationality" value={client.col_11} isEmpty={!client.col_11} />
            <ViewField label="Status" value={client.col_17} isEmpty={!client.col_17} />
          </ViewSection>

          {/* Contact Section */}
          <ViewSection icon={IconContact} title="Contact Information">
            <ViewField label="Email" value={client.col_7} isEmpty={!client.col_7} />
            <ViewField label="Contact No" value={client.col_8} isEmpty={!client.col_8} />
          </ViewSection>

          {/* Address Section */}
          <ViewSection icon={IconHome} title="Address">
            <ViewField label="Country" value={client.col_12} isEmpty={!client.col_12} />
            <ViewField label="City" value={client.col_13} isEmpty={!client.col_13} />
            <ViewField label="Zip Code" value={client.col_14} isEmpty={!client.col_14} />
            <ViewField label="Full Address" value={client.col_15} isEmpty={!client.col_15} />
          </ViewSection>

          {/* KYC Upload */}
          {isUploadUrl(client.col_16) && (
            <div className="view-section-card">
              <div className="view-section-header">
                <IconFile className="view-section-icon" />
                <h3 className="view-section-title">KYC Document</h3>
              </div>
              <FileActionButtons
                fileUrl={client.col_16}
                downloadFilename={`${safeFilenameSegment(clientName)}-KYC`}
                onDownload={(url, name) => handleDownloadFile(url, name)}
              />
            </div>
          )}
        </div>

        {/* Policies Column */}
        <div>
          <div className="view-section-card" style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary)' }}>
            <div className="view-section-header" style={{ borderBottomColor: 'rgba(59, 130, 246, 0.2)' }}>
              <IconShield size={20} className="view-section-icon" />
              <h3 className="view-section-title">Linked Policies</h3>
              <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>
                {policies.length}
              </span>
            </div>
          </div>

          {policies.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 32 }}>
              No policies linked to this client.
            </p>
          ) : (
            <div className="accordion-container">
              {policies.map((policy, i) => (
                <PolicyAccordion
                  key={i}
                  policy={policy}
                  policyIndex={i}
                  clientName={clientName}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ------------------------- POLICY DETAIL -------------------------
function PolicyDetail({ policy, clientInfo, onBack }) {
  const clientName = clientInfo.find(c =>
    (policy.col_1 && c.col_1 === policy.col_1) ||
    (policy.col_2 && c.col_1 === policy.col_2)
  )?.col_1 || '—'
  const policyNo = policy?.col_3 || '—'
  const provider = policy?.col_4 || '—'
  const status = policy?.col_9 || '—'

  return (
    <div className="view-page-content">
      {/* Toolbar */}
      <div className="view-toolbar">
        <div className="view-toolbar-left">
          <button type="button" className="btn btn-secondary" onClick={onBack}>← Back to policies</button>
        </div>
      </div>

      {/* Page Title */}
      <h1 className="page-heading" style={{ marginBottom: 8, fontFamily: 'monospace' }}>{policyNo}</h1>
      <p className="page-description" style={{ marginBottom: 32 }}>
        Policy details for {clientName}
      </p>

      {/* Policy Info Grid */}
      <div style={{ maxWidth: 800 }}>
        {/* Policy Details Section */}
        <ViewSection icon={IconFile} title="Policy Details">
          <ViewField label="Policy Number" value={policy.col_3} isEmpty={!policy.col_3} />
          <ViewField label="Insured Name" value={policy.col_2} isEmpty={!policy.col_2} />
          <ViewField label="Provider" value={policy.col_4} isEmpty={!policy.col_4} />
          <ViewField label="Line" value={policy.col_5} isEmpty={!policy.col_5} />
          <ViewField label="Issued Date" value={policy.col_6} isEmpty={!policy.col_6} />
          <ViewField label="Inception Date" value={policy.col_7} isEmpty={!policy.col_7} />
          <ViewField label="Expiry Date" value={policy.col_8} isEmpty={!policy.col_8} />
          <ViewField label="Status" value={policy.col_9} isEmpty={!policy.col_9} />
        </ViewSection>

        {/* Financial Section */}
        <ViewSection icon={IconDollar} title="Financial Information">
          <ViewField label="Sum Insured" value={policy.col_10} isEmpty={!policy.col_10} />
          <ViewField label="Gross Premium" value={policy.col_11} isEmpty={!policy.col_11} />
          <ViewField label="Basic Premium" value={policy.col_12} isEmpty={!policy.col_12} />
          <ViewField label="Commission" value={policy.col_13} isEmpty={!policy.col_13} />
          <ViewField label="Withholding Tax" value={policy.col_14} isEmpty={!policy.col_14} />
          <ViewField label="VAT" value={policy.col_15} isEmpty={!policy.col_15} />
          <ViewField label="Discount" value={policy.col_16} isEmpty={!policy.col_16} />
          <ViewField label="Net Commission" value={policy.col_17} isEmpty={!policy.col_17} />
        </ViewSection>

        {/* Policy Copy Upload */}
        {isUploadUrl(policy.col_18) && (
          <div className="view-section-card">
            <div className="view-section-header">
              <IconFile className="view-section-icon" />
              <h3 className="view-section-title">Policy Copy</h3>
            </div>
            <FileActionButtons
              fileUrl={policy.col_18}
              downloadFilename={`${safeFilenameSegment(policyNo)}-PolicyCopy`}
              onDownload={(url, name) => handleDownloadFile(url, name)}
            />
          </div>
        )}
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
  const [clientValues, setClientValues] = useState({ ...client })
  const [policyValues, setPolicyValues] = useState(policies.map(p => ({ ...p })))
  const [clientFiles, setClientFiles] = useState({})
  const [policyFiles, setPolicyFiles] = useState(policies.map(() => ({})))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activePolicyTab, setActivePolicyTab] = useState(0)

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
    <div className="page-content page-content--form">
      <div className="detail-toolbar">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
      </div>
      <h2 className="page-heading">Edit Client</h2>
      <p className="page-description">Update client information and linked policies. All fields are organized in sections for easy navigation.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Client Information Card - Same structure as Add Client */}
        <div className="card">
          <FormWithSections
            sheetName="Client_Info"
            values={clientValues}
            onChange={setClient}
            uploadFieldKeys={UPLOAD_FIELD_KEYS.Client_Info}
            files={clientFiles}
            onFileChange={setClientFile}
          />
        </div>

        {/* Linked Policies - Section Tabs for Multiple Policies */}
        {policies.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
              Linked Policies
            </h3>

            {policies.length > 1 && (
              <div className="add-record-tabs" style={{ marginBottom: 16 }}>
                {policies.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`add-record-tab ${activePolicyTab === i ? 'active' : ''}`}
                    onClick={() => setActivePolicyTab(i)}
                  >
                    Policy {i + 1}
                  </button>
                ))}
              </div>
            )}

            <FormWithSections
              sheetName="Policy_Info"
              values={policyValues[activePolicyTab] || {}}
              onChange={(key, value) => setPolicyAt(activePolicyTab, key, value)}
              uploadFieldKeys={UPLOAD_FIELD_KEYS.Policy_Info}
              files={policyFiles[activePolicyTab] || {}}
              onFileChange={(key, file) => setPolicyFileAt(activePolicyTab, key, file)}
            />
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Saving…' : 'Update client'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}

// ------------------------- DATA MANAGEMENT -------------------------
export default function DataManagement() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [selectedClientIndex, setSelectedClientIndex] = useState(null)
  const [selectedPolicyIndex, setSelectedPolicyIndex] = useState(null)
  const [editing, setEditing] = useState(false)
  const [activeSection, setActiveSection] = useState('client') // client or policy
  const [selectedClientIndices, setSelectedClientIndices] = useState(() => new Set())
  const [selectedPolicyIndices, setSelectedPolicyIndices] = useState(() => new Set())
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState('tile') // 'tile' or 'list'
  const [statusFilter, setStatusFilter] = useState('') // '' = All, or specific status

  useEffect(() => {
    if (!isAdmin) navigate('/dashboard', { replace: true })
  }, [isAdmin, navigate])

  if (!isAdmin) return null

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

  // Status filter: client col_17, policy col_9
  const byClientStatus = (c) => !statusFilter || (c.col_17 || '').trim() === statusFilter
  const byPolicyStatus = (p) => !statusFilter || (p.col_9 || '').trim() === statusFilter

  let filteredClients, filteredClientIndices
  const clientStatusFiltered = statusFilter ? clientInfo.filter(byClientStatus) : clientInfo
  const clientStatusIndices = statusFilter ? clientInfo.map((c, i) => (byClientStatus(c) ? i : -1)).filter((i) => i >= 0) : clientInfo.map((_, i) => i)

  if (filterLower) {
    filteredClientIndices = []
    filteredClients = clientStatusFiltered.filter((c, idx) => {
      const realIdx = clientStatusIndices[idx]
      const match =
        (c.col_1 && c.col_1.toLowerCase().includes(filterLower)) ||
        (c.col_7 && c.col_7.toLowerCase().includes(filterLower)) ||
        (c.col_8 && c.col_8.toLowerCase().includes(filterLower))
      if (match) filteredClientIndices.push(realIdx)
      return match
    })
  } else {
    filteredClients = clientStatusFiltered
    filteredClientIndices = clientStatusIndices
  }

  let filteredPolicies, filteredPolicyIndices
  const policyStatusFiltered = statusFilter ? policyInfo.filter(byPolicyStatus) : policyInfo
  const policyStatusIndices = statusFilter ? policyInfo.map((p, i) => (byPolicyStatus(p) ? i : -1)).filter((i) => i >= 0) : policyInfo.map((_, i) => i)

  if (filterLower) {
    filteredPolicyIndices = []
    filteredPolicies = policyStatusFiltered.filter((p, idx) => {
      const realIdx = policyStatusIndices[idx]
      const fullName = (p.col_1 || '').toLowerCase()
      const insuredName = (p.col_2 || '').toLowerCase()
      const policyNo = (p.col_3 || '').toLowerCase()
      const provider = (p.col_4 || '').toLowerCase()
      const line = (p.col_5 || '').toLowerCase()
      const match =
        fullName.includes(filterLower) ||
        insuredName.includes(filterLower) ||
        policyNo.includes(filterLower) ||
        provider.includes(filterLower) ||
        line.includes(filterLower)
      if (match) filteredPolicyIndices.push(realIdx)
      return match
    })
  } else {
    filteredPolicies = policyStatusFiltered
    filteredPolicyIndices = policyStatusIndices
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
        onSave={() => { setEditing(false); setSelectedClientIndex(null); load() }}
        onCancel={() => { setEditing(false); setSelectedClientIndex(null) }}
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
      <h1 className="page-heading">Data management</h1>
      <div className="page-actions page-actions--row">
        <SearchInput
          value={filter}
          onChange={setFilter}
          placeholder={activeSection === 'policy'
            ? 'Filter by policy no, provider, insured name...'
            : 'Filter by name, email, contact...'}
          ariaLabel="Filter records"
        />
        <button
          type="button"
          onClick={() => navigate('/add/client')}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <IconPlus size={18} /> Add client
        </button>
        <button
          type="button"
          onClick={() => navigate('/add/policy')}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <IconPlus size={18} /> Add policy
        </button>
        <select
          className="input input-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          style={{ maxWidth: 160 }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {activeSection === 'client' && selectedClientIndices.size > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelectedClients}
            disabled={deleting}
            className="btn btn-danger-solid"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <IconTrash size={16} /> Delete selected ({selectedClientIndices.size})
          </button>
        )}
        {activeSection === 'policy' && selectedPolicyIndices.size > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelectedPolicies}
            disabled={deleting}
            className="btn btn-danger-solid"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <IconTrash size={16} /> Delete selected ({selectedPolicyIndices.size})
          </button>
        )}
      </div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
      <div className="section-toggle">
        <button
          type="button"
          className={activeSection === 'client' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => {
            setActiveSection('client')
            setSelectedPolicyIndices(new Set())
          }}
        >
          Client Information
        </button>
        <button
          type="button"
          className={activeSection === 'policy' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => {
            setActiveSection('policy')
            setSelectedClientIndices(new Set())
          }}
        >
          Issued Policy Details
        </button>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          type="button"
          className={`view-toggle-btn ${viewMode === 'tile' ? 'active' : ''}`}
          onClick={() => setViewMode('tile')}
          aria-label="Tile view"
          title="Tile view"
        >
          <IconGrid size={16} />
          <span>Grid</span>
        </button>
        <button
          type="button"
          className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
          aria-label="List view"
          title="List view"
        >
          <IconList size={16} />
          <span>List</span>
        </button>
      </div>
    </div>

    {/* ================= CLIENT VIEW ================= */}
    {activeSection === 'client' ? (
      filteredClients.length === 0 ? (
        <p className="text-muted">No clients found.</p>
      ) : viewMode === 'tile' ? (
        /* ===== TILE VIEW - CLIENTS ===== */
        <div className="card-grid">
          {filteredClients.map((client, i) => {
            const realIndex = filteredClientIndices[i]
            const isSelected = selectedClientIndices.has(realIndex)
            const fullName = client.col_1 || '—'
            const email = client.col_7 || '—'
            const contactNo = client.col_8 || '—'
            const fullAddress = client.col_15 || '—'
            const status = client.col_17 || '—'

            return (
              <div
                key={realIndex}
                className="card client-card dm-card"
                style={{ outline: isSelected ? '2px solid var(--primary)' : undefined }}
              >
                <div className="dm-card-header">
                  <div style={{ minWidth: 0 }}>
                    <h3 className="dm-card-title">{fullName}</h3>
                    <p className="dm-card-subtitle">{email}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleClientSelection(realIndex)}
                    aria-label={`Select ${fullName}`}
                    className="dm-card-checkbox"
                  />
                </div>
                <div className="dm-card-meta">
                  <div className="dm-card-meta-row">
                    <IconPhone className="dm-card-meta-icon" />
                    <span>{contactNo}</span>
                  </div>
                  <div className="dm-card-meta-row">
                    <IconMapPin className="dm-card-meta-icon" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullAddress}</span>
                  </div>
                  <div className="dm-card-meta-row" style={{ marginTop: 8 }}>
                    <span className={`status-badge ${status === 'Active' ? 'status-badge--active' : 'status-badge--neutral'}`}>
                      {status === 'Active' && <span className="status-dot status-dot--active" />}
                      {status || '—'}
                    </span>
                  </div>
                </div>
                <div className="dm-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setSelectedClientIndex(i)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setSelectedClientIndex(i); setEditing(true) }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDeleteOneClient(realIndex)}
                    disabled={deleting}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ===== LIST VIEW - CLIENTS ===== */
        <div className="list-view">
          {filteredClients.map((client, i) => {
            const realIndex = filteredClientIndices[i]
            const isSelected = selectedClientIndices.has(realIndex)
            const fullName = client.col_1 || '—'
            const email = client.col_7 || ''
            const contactNo = client.col_8 || '—'
            const status = client.col_17 || '—'

            return (
              <div
                key={realIndex}
                className={`dm-list-item ${isSelected ? 'selected' : ''}`}
                style={{ outline: isSelected ? '2px solid var(--primary)' : undefined }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleClientSelection(realIndex)}
                  aria-label={`Select ${fullName}`}
                  className="dm-list-checkbox"
                />
                <div className="dm-list-content">
                  <div className="dm-list-main">
                    <h3 className="dm-list-title">{fullName}</h3>
                    {email && <p className="dm-list-subtitle">{email}</p>}
                  </div>
                  <div className="dm-list-meta">
                    <IconPhone size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {contactNo}
                  </div>
                  <div className="dm-list-meta">
                    <span className={`status-badge ${status === 'Active' ? 'status-badge--active' : 'status-badge--neutral'}`}>
                      {status === 'Active' && <span className="status-dot status-dot--active" />}
                      {status || '—'}
                    </span>
                  </div>
                  <div className="dm-list-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setSelectedClientIndex(i)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setSelectedClientIndex(i); setEditing(true) }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDeleteOneClient(realIndex)}
                      disabled={deleting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    ) : (
      /* ================= POLICY VIEW ================= */
      filteredPolicies.length === 0 ? (
        <p className="text-muted">No policies found.</p>
      ) : viewMode === 'tile' ? (
        /* ===== TILE VIEW - POLICIES ===== */
        <div className="card-grid">
          {filteredPolicies.map((policy, i) => {
            const realIndex = filteredPolicyIndices[i]
            const isSelected = selectedPolicyIndices.has(realIndex)
            const insuredName = policy.col_2 || '—'
            const insuranceLine = policy.col_5 || '—'
            const policyNumber = policy.col_3 || '—'
            const status = policy.col_9 || '—'
            const provider = policy.col_4 || '—'

            return (
              <div
                key={realIndex}
                className="card policy-card dm-card"
                style={{ outline: isSelected ? '2px solid var(--primary)' : undefined }}
              >
                <div className="dm-card-header">
                  <div style={{ minWidth: 0 }}>
                    <h3 className="dm-card-title" style={{ fontFamily: 'monospace', fontSize: 15 }}>{policyNumber}</h3>
                    <p className="dm-card-subtitle">{provider}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePolicySelection(realIndex)}
                    aria-label={`Select policy ${policyNumber}`}
                    className="dm-card-checkbox"
                  />
                </div>
                <div className="dm-card-meta">
                  <div className="dm-card-meta-row">
                    <IconUser className="dm-card-meta-icon" />
                    <span>{insuredName}</span>
                  </div>
                  <div className="dm-card-meta-row">
                    <IconShield className="dm-card-meta-icon" />
                    <span>{insuranceLine || '—'}</span>
                  </div>
                  <div className="dm-card-meta-row" style={{ marginTop: 8 }}>
                    <span className={`status-badge ${status === 'Active' ? 'status-badge--active' : status === 'Expired' ? 'status-badge--inactive' : 'status-badge--neutral'}`}>
                      {status === 'Active' && <span className="status-dot status-dot--active" />}
                      {status === 'Expired' && <span className="status-dot status-dot--inactive" />}
                      {status || '—'}
                    </span>
                  </div>
                </div>
                <div className="dm-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setSelectedPolicyIndex(i)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDeleteOnePolicy(realIndex)}
                    disabled={deleting}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ===== LIST VIEW - POLICIES ===== */
        <div className="list-view">
          {filteredPolicies.map((policy, i) => {
            const realIndex = filteredPolicyIndices[i]
            const isSelected = selectedPolicyIndices.has(realIndex)
            const insuredName = policy.col_2 || '—'
            const insuranceLine = policy.col_5 || '—'
            const policyNumber = policy.col_3 || '—'
            const status = policy.col_9 || '—'
            const provider = policy.col_4 || '—'

            return (
              <div
                key={realIndex}
                className={`dm-list-item ${isSelected ? 'selected' : ''}`}
                style={{ outline: isSelected ? '2px solid var(--primary)' : undefined }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => togglePolicySelection(realIndex)}
                  aria-label={`Select policy ${policyNumber}`}
                  className="dm-list-checkbox"
                />
                <div className="dm-list-content">
                  <div className="dm-list-main">
                    <h3 className="dm-list-title" style={{ fontFamily: 'monospace' }}>{policyNumber}</h3>
                    <p className="dm-list-subtitle">{provider} · {insuranceLine || '—'}</p>
                  </div>
                  <div className="dm-list-meta">
                    <IconUser size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {insuredName}
                  </div>
                  <div className="dm-list-meta">
                    <span className={`status-badge ${status === 'Active' ? 'status-badge--active' : status === 'Expired' ? 'status-badge--inactive' : 'status-badge--neutral'}`}>
                      {status === 'Active' && <span className="status-dot status-dot--active" />}
                      {status === 'Expired' && <span className="status-dot status-dot--inactive" />}
                      {status || '—'}
                    </span>
                  </div>
                  <div className="dm-list-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setSelectedPolicyIndex(i)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDeleteOnePolicy(realIndex)}
                      disabled={deleting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    )}
  </div>
  )
}