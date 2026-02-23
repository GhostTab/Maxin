import { useRef, useState, useCallback, useEffect } from 'react'
import { HotTable } from '@handsontable/react'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import { SHEET_NAMES, getHandsontableColumns } from '../config/spreadsheetColumns'
import { getCurrentSubmission } from '../lib/submissions'

registerAllModules()

function getGridDataFromHot(hotRef, columns) {
  const hot = hotRef?.current?.hotInstance
  if (!hot) return []
  const rowCount = hot.countRows()
  const data = []
  for (let r = 0; r < rowCount; r++) {
    const row = {}
    columns.forEach((col, c) => {
      row[col.data] = hot.getDataAtCell(r, c) ?? ''
    })
    data.push(row)
  }
  return data.filter((row) => Object.values(row).some((v) => v !== '' && v != null))
}

export default function Spreadsheet() {
  const hotRefClient = useRef(null)
  const hotRefPolicy = useRef(null)
  const [activeTab, setActiveTab] = useState(SHEET_NAMES[0])
  const [currentData, setCurrentData] = useState(null)
  const [clientGridData, setClientGridData] = useState([])
  const [policyGridData, setPolicyGridData] = useState([])

  const clientColumns = getHandsontableColumns('Client_Info')
  const policyColumns = getHandsontableColumns('Policy_Info')

  useEffect(() => {
    let mounted = true
    getCurrentSubmission()
      .then((current) => {
        if (!mounted) return
        setCurrentData(current?.data || null)
      })
      .catch(() => setCurrentData(null))
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (currentData == null) return
    const clientRows = Array.isArray(currentData.client_info) ? currentData.client_info : []
    const policyRows = Array.isArray(currentData.policy_info) ? currentData.policy_info : []
    setClientGridData(clientRows.length ? clientRows : [{}])
    setPolicyGridData(policyRows.length ? policyRows : [{}])
  }, [currentData])

  const switchTab = useCallback((name) => {
    if (name === activeTab) return
    if (activeTab === 'Client_Info') {
      const rows = getGridDataFromHot(hotRefClient, clientColumns)
      setClientGridData(rows.length ? rows : [{}])
    } else {
      const rows = getGridDataFromHot(hotRefPolicy, policyColumns)
      setPolicyGridData(rows.length ? rows : [{}])
    }
    setActiveTab(name)
  }, [activeTab, clientColumns, policyColumns])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Data view (read-only)</h2>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {SHEET_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => switchTab(name)}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--maxin-light)',
              borderRadius: 8,
              background: activeTab === name ? 'var(--maxin-dark)' : 'var(--maxin-white)',
              color: activeTab === name ? 'var(--maxin-white)' : 'var(--maxin-dark)',
              fontWeight: activeTab === name ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {name.replace('_', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'Client_Info' && (
        <div className="hot-container">
          <HotTable
            ref={hotRefClient}
            key="client"
            data={clientGridData.length ? clientGridData : [{}]}
            columns={clientColumns}
            colHeaders={clientColumns.map((c) => c.title)}
            rowHeaders={true}
            licenseKey="non-commercial-and-evaluation"
            minRows={10}
            minCols={clientColumns.length}
            contextMenu={true}
            manualColumnResize={true}
            autoWrapRow={true}
            autoWrapCol={true}
            wordWrap={false}
            autoRowSize={true}
            autoColumnSize={true}
            minColWidth={60}
            readOnly={true}
          />
        </div>
      )}
      {activeTab === 'Policy_Info' && (
        <div className="hot-container">
          <HotTable
            ref={hotRefPolicy}
            key="policy"
            data={policyGridData.length ? policyGridData : [{}]}
            columns={policyColumns}
            colHeaders={policyColumns.map((c) => c.title)}
            rowHeaders={true}
            licenseKey="non-commercial-and-evaluation"
            minRows={10}
            minCols={policyColumns.length}
            contextMenu={true}
            manualColumnResize={true}
            autoWrapRow={true}
            autoWrapCol={true}
            wordWrap={false}
            autoRowSize={true}
            autoColumnSize={true}
            minColWidth={60}
            readOnly={true}
          />
        </div>
      )}
    </div>
  )
}
