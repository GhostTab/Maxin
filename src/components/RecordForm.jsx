/**
 * Shared form section for Add Record and Edit Client.
 * Uses design tokens from index.css (--card-bg, --input-border, etc.)
 */

import { FORM_SECTIONS, getColumnsForSection } from '../config/spreadsheetColumns'

export const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx'

/**
 * Generate appropriate placeholder text based on field title and input type
 */
function getPlaceholder(col) {
  const title = col.title || ''
  const lower = title.toLowerCase()

  // Date fields
  if (col.inputType === 'date') {
    return 'Select date'
  }

  // Email fields
  if (col.inputType === 'email') {
    return 'Enter email address'
  }

  // Phone fields
  if (col.inputType === 'tel') {
    return 'Enter phone number'
  }

  // Number fields
  if (col.inputType === 'number') {
    if (lower.includes('tax')) return 'Enter tax amount'
    if (lower.includes('commission')) return 'Enter commission'
    if (lower.includes('premium')) return 'Enter premium amount'
    if (lower.includes('discount')) return 'Enter discount'
    if (lower.includes('sum')) return 'Enter sum insured'
    return 'Enter amount'
  }

  // Upload fields
  if (col.inputType === 'file' || title.includes('Upload')) {
    return 'Choose file to upload'
  }

  // Select fields (dropdowns)
  if (col.inputType === 'select') {
    return `Select ${lower}`
  }

  // Text fields - context-aware based on field name
  const placeholderMap = {
    'full name': 'Enter full name',
    'first name': 'Enter first name',
    'middle name': 'Enter middle name',
    'last name': 'Enter last name',
    'suffix': 'Enter name suffix (e.g., Jr., Sr., III)',
    'tin': 'Enter TIN number',
    'birthday': 'Select birthday',
    'birth place': 'Enter birthplace',
    'nationality': 'Select nationality',
    'country': 'Enter country',
    'city': 'Enter city',
    'zip code': 'Enter ZIP code',
    'full address': 'Enter complete address',
    'status': 'Select status',
    'insured name': 'Enter insured name',
    'policy no': 'Enter policy number',
    'provider': 'Select insurance provider',
    'line': 'Enter insurance line',
    'issued date': 'Select issued date',
    'inception date': 'Select inception date',
    'expiry date': 'Select expiry date',
    'sum insured': 'Enter sum insured',
    'gross premium': 'Enter gross premium',
    'basic premium': 'Enter basic premium',
    'commission': 'Enter commission amount',
    'withholding tax': 'Enter withholding tax',
    'vat': 'Enter VAT amount',
    'discount': 'Enter discount amount',
    'net commission': 'Calculated automatically',
    'upload kyc': 'Upload KYC document',
    'upload policy copy': 'Upload policy document',
  }

  for (const [key, value] of Object.entries(placeholderMap)) {
    if (lower.includes(key)) return value
  }

  // Default placeholder
  return `Enter ${lower}`
}

const cardStyle = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border-subtle, #e8ecf1)',
  borderRadius: 'var(--radius-lg, 12px)',
  padding: 'var(--space-card, 24px)',
  marginBottom: 24,
  boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.04))',
}
const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--input-border, #e2e8f0)',
  borderRadius: 'var(--radius-md, 8px)',
  fontSize: 14,
  transition: 'border-color 0.15s, box-shadow 0.15s',
}
const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-secondary, #334155)',
}
const fieldStyle = { marginBottom: 16 }

export const formSectionTitleStyle = { margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }
export const formSectionGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0 24px' }

export function FormSection({ title, columns, values, onChange, uploadFieldKeys = [], files, onFileChange, insideCard }) {
  const sectionContent = (
    <>
      <h3 style={formSectionTitleStyle} className="form-section-title">{title}</h3>
      <div style={formSectionGridStyle} className="form-section-grid">
        {columns.map((col) => {
          const isUpload = uploadFieldKeys.includes(col.data)
          return (
            <div key={col.data} style={fieldStyle} className="form-field">
              <label style={labelStyle} className="form-label">{col.title}</label>
              {isUpload ? (
                <div>
                  <div className="input-file-wrap">
                    <input
                      type="file"
                      id={`file-${col.data}`}
                      className="input-file"
                      accept={FILE_ACCEPT}
                      onChange={(e) => onFileChange(col.data, e.target.files?.[0] ?? null)}
                    />
                    <label htmlFor={`file-${col.data}`} className="input-file-label">
                      <span>{files[col.data] || values[col.data] ? 'Change file' : 'Choose file'}</span>
                    </label>
                  </div>
                  {(files[col.data] || values[col.data]) && (
                    <span className="input-file-filename">
                      {files[col.data] ? files[col.data].name : (values[col.data]?.startsWith('http') ? 'Saved file' : values[col.data])}
                    </span>
                  )}
                </div>
              ) : col.inputType === 'select' && Array.isArray(col.options) ? (
                <select
                  className="input-select"
                  value={values[col.data] ?? ''}
                  onChange={(e) => onChange(col.data, e.target.value)}
                >
                  <option value="">Select {col.title.toLowerCase()}…</option>
                  {col.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={col.inputType || 'text'}
                  className="input"
                  style={{ ...inputStyle, ...(col.readOnly ? { backgroundColor: 'var(--input-readonly-bg, #f1f5f9)', cursor: 'default' } : {}) }}
                  value={values[col.data] ?? ''}
                  onChange={(e) => onChange(col.data, e.target.value)}
                  placeholder={getPlaceholder(col)}
                  min={col.inputType === 'number' ? '0' : undefined}
                  step={col.inputType === 'number' ? 'any' : undefined}
                  readOnly={col.readOnly}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
  if (insideCard) {
    return <div className="form-section form-section--inside-card">{sectionContent}</div>
  }
  return (
    <div style={cardStyle} className="form-section">
      {sectionContent}
    </div>
  )
}

/**
 * View & Download file action buttons for view pages.
 * View = open in new tab (preview). Download = save file to device.
 */
export function FileActionButtons({ fileUrl, downloadFilename, onDownload }) {
  if (!fileUrl) return null
  return (
    <div className="file-actions">
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-view-file"
        aria-label="View file in new tab"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        View
      </a>
      <button
        type="button"
        className="btn-download-file"
        onClick={() => onDownload(fileUrl, downloadFilename)}
        aria-label="Download file"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
      </button>
    </div>
  )
}

/**
 * Modern Search Input Component with Icon
 * Consistent across Spreadsheet and Data Management pages
 */
export function SearchInput({ value, onChange, placeholder, ariaLabel }) {
  return (
    <div className="search-input-wrapper">
      <svg
        className="search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  )
}

/**
 * Renders a form with multiple sections (Identity, Contact, Policy Details, Additional).
 * Use for Add Client and Add Policy inside a single card.
 */
export function FormWithSections({
  sheetName,
  values,
  onChange,
  uploadFieldKeys = [],
  files,
  onFileChange,
}) {
  const sections = FORM_SECTIONS[sheetName] || []
  if (sections.length === 0) {
    return null
  }
  return (
    <>
      {sections.map((sec) => {
        const columns = getColumnsForSection(sheetName, sec.keys)
        if (columns.length === 0) return null
        return (
          <FormSection
            key={sec.title}
            title={sec.title}
            columns={columns}
            values={values}
            onChange={onChange}
            uploadFieldKeys={uploadFieldKeys}
            files={files}
            onFileChange={onFileChange}
            insideCard
          />
        )
      })}
    </>
  )
}
