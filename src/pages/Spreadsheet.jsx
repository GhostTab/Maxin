import { useState, useEffect } from 'react'
import { HotTable } from '@handsontable/react'
import 'handsontable/dist/handsontable.min.css'
import { getCurrentSubmission } from '../lib/submissions'
import { useAuth } from '../context/AuthContext'
import { filterDataByClientEmail } from '../lib/filterClientData'
import { getHandsontableColumns } from '../config/spreadsheetColumns'
import { SHEET_NAMES } from '../config/spreadsheetColumns'
import { exportCurrentToExcel } from '../lib/exportExcel'

export default function Spreadsheet() {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState(SHEET_NAMES[0])
  const [currentData, setCurrentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let mounted = true
    getCurrentSubmission()
      .then((current) => {
        if (!mounted) return
        const raw = current?.data || null
        const toSet = raw && !isAdmin ? filterDataByClientEmail(raw, user?.email) : raw
        setCurrentData(toSet)
      })
      .catch(() => setCurrentData(null))
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [isAdmin, user?.email])

  const clientInfo = currentData?.client_info ?? []
  const policyInfo = currentData?.policy_info ?? []

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const raw = await getCurrentSubmission()
      const payload = !isAdmin
        ? { ...raw, data: filterDataByClientEmail(raw?.data || {}, user?.email) }
        : raw
      await exportCurrentToExcel(payload)
    } catch (err) {
      alert(err.message || 'Failed to download.')
    } finally {
      setDownloading(false)
    }
  }

  const clientColumns = getHandsontableColumns('Client_Info')
  const policyColumns = getHandsontableColumns('Policy_Info')

  if (loading) {
    return (
      <div className="page-content">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {SHEET_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            className={activeTab === name ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setActiveTab(name)}
          >
            {name.replace('_', ' ')}
          </button>
        ))}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="btn btn-primary"
        >
          {downloading ? 'Preparing…' : 'Download Excel'}
        </button>
      </div>

      {(activeTab === 'Client_Info' ? clientInfo.length === 0 : policyInfo.length === 0) ? (
        <p style={{ color: 'var(--text-muted)' }}>
          {activeTab === 'Client_Info' ? 'No clients yet.' : 'No policies yet.'}
        </p>
      ) : (
        <HotTable
          data={activeTab === 'Client_Info' ? clientInfo : policyInfo}
          columns={activeTab === 'Client_Info' ? clientColumns : policyColumns}
          colHeaders={(activeTab === 'Client_Info' ? clientColumns : policyColumns).map((c) => c.title)}
          rowHeaders={true}
          readOnly={true}
          licenseKey="non-commercial-and-evaluation"
          height={480}
          stretchH="none"
          autoColumnSize={true}
          manualColumnResize={true}
        />
      )}
    </div>
  )
}
