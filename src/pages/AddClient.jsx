import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentSubmission, saveCurrent } from '../lib/submissions'
import { uploadFile } from '../lib/upload'
import { SPREADSHEET_COLUMNS, UPLOAD_FIELD_KEYS } from '../config/spreadsheetColumns'
import { FormSection } from '../components/RecordForm'

const clientCols = SPREADSHEET_COLUMNS.Client_Info

function isFieldFilled(col, values, files) {
  if (UPLOAD_FIELD_KEYS.Client_Info.includes(col.data)) {
    return !!(files[col.data] || (values[col.data] != null && String(values[col.data]).trim() !== ''))
  }
  const v = values[col.data]
  return v != null && String(v).trim() !== ''
}

export default function AddClient() {
  const navigate = useNavigate()
  const [clientValues, setClientValues] = useState({})
  const [clientFiles, setClientFiles] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const setClient = (key, value) => setClientValues((prev) => ({ ...prev, [key]: value }))
  const setClientFile = (key, file) => setClientFiles((prev) => ({ ...prev, [key]: file }))

  const allClientFilled = clientCols.every((col) => isFieldFilled(col, clientValues, clientFiles))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!allClientFilled) {
      setError('Please fill in all client fields.')
      return
    }
    setSubmitting(true)
    try {
      const current = await getCurrentSubmission()
      const data = current?.data || { client_info: [], policy_info: [] }
      const clientInfo = Array.isArray(data.client_info) ? data.client_info : []
      const policyInfo = Array.isArray(data.policy_info) ? data.policy_info : []

      const clientRow = {}
      for (const col of clientCols) {
        if (UPLOAD_FIELD_KEYS.Client_Info.includes(col.data) && clientFiles[col.data]) {
          clientRow[col.data] = await uploadFile(supabase, 'kyc', clientFiles[col.data])
        } else {
          clientRow[col.data] = clientValues[col.data] ?? ''
        }
      }

      await saveCurrent(supabase, {
        client_info: [...clientInfo, clientRow],
        policy_info: policyInfo,
      }, `Added client: ${(clientValues.col_1 || '').trim() || 'New client'}`)

      setSuccess(true)
      setClientValues({})
      setClientFiles({})
      setTimeout(() => navigate('/data'), 1500)
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-content">
      <h2 className="page-heading">Add client</h2>
      <p className="page-description">Add a new client. You can add policies for this client later from Add policy.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Client saved. Redirecting to Data management…</div>}

      <form onSubmit={handleSubmit}>
        <FormSection
          title="Client information"
          columns={clientCols}
          values={clientValues}
          onChange={setClient}
          uploadFieldKeys={UPLOAD_FIELD_KEYS.Client_Info}
          files={clientFiles}
          onFileChange={setClientFile}
        />

        <div className="form-actions">
          <button
            type="submit"
            disabled={submitting || !allClientFilled}
            className="btn btn-primary"
          >
            {submitting ? 'Saving…' : 'Save client'}
          </button>
          <button type="button" onClick={() => navigate('/data')} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
