/**
 * Shared form section for Add Record and Edit Client.
 * Uses design tokens from index.css (--card-bg, --input-border, etc.)
 */

export const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx'

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

export function FormSection({ title, columns, values, onChange, uploadFieldKeys = [], files, onFileChange }) {
  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #0f172a)', letterSpacing: '0.01em' }}>
        {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0 24px' }}>
        {columns.map((col) => {
          const isUpload = uploadFieldKeys.includes(col.data)
          return (
            <div key={col.data} style={fieldStyle}>
              <label style={labelStyle}>{col.title}</label>
              {isUpload ? (
                <div>
                  <input
                    type="file"
                    accept={FILE_ACCEPT}
                    onChange={(e) => onFileChange(col.data, e.target.files?.[0] ?? null)}
                    style={{ ...inputStyle, padding: 8 }}
                  />
                  {(files[col.data] || values[col.data]) && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', display: 'block', marginTop: 6 }}>
                      {files[col.data] ? files[col.data].name : (values[col.data]?.startsWith('http') ? 'Saved file' : values[col.data])}
                    </span>
                  )}
                </div>
              ) : col.inputType === 'select' && Array.isArray(col.options) ? (
                <select
                  style={inputStyle}
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
                  style={{ ...inputStyle, ...(col.readOnly ? { backgroundColor: 'var(--input-readonly-bg, #f1f5f9)', cursor: 'default' } : {}) }}
                  value={values[col.data] ?? ''}
                  onChange={(e) => onChange(col.data, e.target.value)}
                  placeholder={col.inputType === 'date' ? 'Select date' : undefined}
                  min={col.inputType === 'number' ? '0' : undefined}
                  step={col.inputType === 'number' ? 'any' : undefined}
                  readOnly={col.readOnly}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
