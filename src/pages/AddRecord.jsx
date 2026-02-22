import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentSubmission, saveCurrent } from '../lib/submissions'
import { uploadFile } from '../lib/upload'
import { SPREADSHEET_COLUMNS, UPLOAD_FIELD_KEYS } from '../config/spreadsheetColumns'
import { FormSection } from '../components/RecordForm'

const clientCols = SPREADSHEET_COLUMNS.Client_Info
const policyCols = SPREADSHEET_COLUMNS.Policy_Info

export default function AddRecord() {
  const navigate = useNavigate()
  const [clientValues, setClientValues] = useState({})
  const [policyValues, setPolicyValues] = useState({})
  const [clientFiles, setClientFiles] = useState({})
  const [policyFiles, setPolicyFiles] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const setClient = (key, value) => setClientValues((prev) => ({ ...prev, [key]: value }))
  const setPolicy = (key, value) => setPolicyValues((prev) => ({ ...prev, [key]: value }))
  const setClientFile = (key, file) => setClientFiles((prev) => ({ ...prev, [key]: file }))
  const setPolicyFile = (key, file) => setPolicyFiles((prev) => ({ ...prev, [key]: file }))

  function isFieldFilled(col, values, files) {
    const isUpload = (UPLOAD_FIELD_KEYS.Client_Info.includes(col.data) || UPLOAD_FIELD_KEYS.Policy_Info.includes(col.data))
    if (isUpload) {
      const hasFile = files[col.data]
      const hasValue = values[col.data] != null && String(values[col.data]).trim() !== ''
      return !!(hasFile || hasValue)
    }
    const v = values[col.data]
    return v != null && String(v).trim() !== ''
  }

  const allClientFilled = clientCols.every((col) => isFieldFilled(col, clientValues, clientFiles))
  const allPolicyFilled = policyCols.every((col) => isFieldFilled(col, policyValues, policyFiles))
  const formComplete = allClientFilled && allPolicyFilled

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!formComplete) {
      setError('Please fill in all fields before submitting.')
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
      const policyRow = {}
      for (const col of policyCols) {
        if (UPLOAD_FIELD_KEYS.Policy_Info.includes(col.data) && policyFiles[col.data]) {
          policyRow[col.data] = await uploadFile(supabase, 'policy', policyFiles[col.data])
        } else {
          policyRow[col.data] = policyValues[col.data] ?? ''
        }
      }

      await saveCurrent(supabase, {
        client_info: [...clientInfo, clientRow],
        policy_info: [...policyInfo, policyRow],
      }, `Added record: ${(clientValues.col_1 || '').trim() || 'New client'}`)

      setSuccess(true)
      setClientValues({})
      setPolicyValues({})
      setClientFiles({})
      setPolicyFiles({})
      setTimeout(() => navigate('/data'), 1500)
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-content">
      <h2 className="page-heading">Add new record</h2>
      <p className="page-description">Fill in client and policy details, then submit to save.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Saved. Redirecting to Data management…</div>}

      <form onSubmit={handleSubmit}>
        <FormSection
          title="Client info"
          columns={clientCols}
          values={clientValues}
          onChange={setClient}
          uploadFieldKeys={UPLOAD_FIELD_KEYS.Client_Info}
          files={clientFiles}
          onFileChange={setClientFile}
        />
        <FormSection
          title="Policy info"
          columns={policyCols}
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
            {submitting ? 'Saving…' : 'Submit'}
          </button>
          <button type="button" onClick={() => navigate('/data')} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
