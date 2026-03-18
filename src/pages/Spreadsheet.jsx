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
        <h1 className="page-heading">Spreadsheet</h1>
        <p className="page-description">View clients and policies in a spreadsheet.</p>
        <div className="loading-state">Loading…</div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: 28, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <h1 className="page-heading">Spreadsheet</h1>
          <p className="page-description">View and download client and policy data in a spreadsheet format.</p>
        </div>
        <div className="spreadsheet-toolbar">
          <div className="section-toggle" style={{ margin: 0 }}>
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
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-primary spreadsheet-download-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{downloading ? 'Preparing…' : 'Download Excel'}</span>
          </button>
        </div>
      </div>

      {(activeTab === 'Client_Info' ? clientInfo.length === 0 : policyInfo.length === 0) ? (
        <div className="spreadsheet-card">
          <div className="spreadsheet-card-header">
            <div>
              <h2 className="spreadsheet-card-title">{activeTab.replace('_', ' ')}</h2>
              <p className="spreadsheet-card-meta">
                {activeTab === 'Client_Info' ? 'No clients yet.' : 'No policies yet.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="spreadsheet-card">
          <div className="spreadsheet-card-header">
            <div>
              <h2 className="spreadsheet-card-title">{activeTab.replace('_', ' ')}</h2>
              <p className="spreadsheet-card-meta">
                {(activeTab === 'Client_Info' ? clientInfo.length : policyInfo.length).toLocaleString()} row(s)
              </p>
            </div>
          </div>
          <div className="hot-container">
            {activeTab === 'Client_Info' ? (
              <HotTable
                data={clientInfo}
                columns={clientColumns}
                colHeaders={clientColumns.map((c) => c.title)}
                rowHeaders={true}
                readOnly={true}
                licenseKey="non-commercial-and-evaluation"
                height="480"
                stretchH="all"
                className="modern-handsontable"
              />
            ) : (
              <HotTable
                data={policyInfo}
                columns={policyColumns}
                colHeaders={policyColumns.map((c) => c.title)}
                rowHeaders={true}
                readOnly={true}
                licenseKey="non-commercial-and-evaluation"
                height="480"
                stretchH="all"
                className="modern-handsontable"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
