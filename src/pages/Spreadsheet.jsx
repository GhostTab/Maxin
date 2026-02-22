import { useRef, useState, useCallback, useEffect } from 'react'
import { HotTable } from '@handsontable/react'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import { SHEET_NAMES, getHandsontableColumns } from '../config/spreadsheetColumns'
import { supabase } from '../lib/supabase'
import { getCurrentSubmission, saveCurrent } from '../lib/submissions'
import { useUnsaved } from '../context/UnsavedContext'

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

function recalcRowHeights(hotRef, changes, source) {
  if (source === 'editRecalc') return
  const hot = hotRef?.current?.hotInstance
  if (!hot || !changes?.length) return
  const autoRowSize = hot.getPlugin('autoRowSize')
  if (autoRowSize && typeof autoRowSize.recalculateAllRowsHeight === 'function') {
    autoRowSize.recalculateAllRowsHeight()
    hot.render()
  }
}

function recalcColumnWidth(hotRef, columnIndex) {
  const hot = hotRef?.current?.hotInstance
  if (!hot || columnIndex == null) return
  const autoColSize = hot.getPlugin('autoColumnSize')
  if (autoColSize && typeof autoColSize.recalculateAllColumnsWidth === 'function') {
    autoColSize.recalculateAllColumnsWidth()
    hot.render()
  }
}

function afterChangeWithRecalc(hotRef, changes, source) {
  if (source === 'editRecalc') return
  recalcRowHeights(hotRef, changes, source)
  if (changes?.length) {
    recalcColumnWidth(hotRef, changes[0][1])
  }
}

const LOCAL_DRAFT_KEY = 'maxin-spreadsheet-draft'
const LOCAL_DRAFT_DELAY_MS = 2000

function getLocalDraft() {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch (_) {}
  return null
}

function setLocalDraft(payload) {
  try {
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(payload))
  } catch (_) {}
}

function clearLocalDraft() {
  try {
    localStorage.removeItem(LOCAL_DRAFT_KEY)
  } catch (_) {}
}

export default function Spreadsheet() {
  const hotRefClient = useRef(null)
  const hotRefPolicy = useRef(null)
  const localDraftTimeoutRef = useRef(null)
  const [activeTab, setActiveTab] = useState(SHEET_NAMES[0])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [submitting, setSubmitting] = useState(false)
  const [currentData, setCurrentData] = useState(null)
  const [clientGridData, setClientGridData] = useState([])
  const [policyGridData, setPolicyGridData] = useState([])
  const [commitMessage, setCommitMessage] = useState('')
  const { setUnsavedChanges } = useUnsaved()

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
    const draft = getLocalDraft()
    const source = draft ?? currentData
    const clientRows = Array.isArray(source.client_info) ? source.client_info : []
    const policyRows = Array.isArray(source.policy_info) ? source.policy_info : []
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

  const getAllData = useCallback(() => {
    const clientRows = activeTab === 'Client_Info'
      ? getGridDataFromHot(hotRefClient, clientColumns)
      : clientGridData
    const policyRows = activeTab === 'Policy_Info'
      ? getGridDataFromHot(hotRefPolicy, policyColumns)
      : policyGridData
    return { client_info: clientRows, policy_info: policyRows }
  }, [activeTab, clientGridData, policyGridData, clientColumns, policyColumns])

  const scheduleLocalDraft = useCallback(() => {
    if (localDraftTimeoutRef.current) clearTimeout(localDraftTimeoutRef.current)
    localDraftTimeoutRef.current = setTimeout(() => {
      localDraftTimeoutRef.current = null
      setLocalDraft(getAllData())
    }, LOCAL_DRAFT_DELAY_MS)
  }, [getAllData])

  useEffect(() => {
    return () => {
      if (localDraftTimeoutRef.current) clearTimeout(localDraftTimeoutRef.current)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (localDraftTimeoutRef.current) {
      clearTimeout(localDraftTimeoutRef.current)
      localDraftTimeoutRef.current = null
    }
    const payload = getAllData()
    setSubmitting(true)
    setMessage({ type: '', text: '' })
    try {
      await saveCurrent(supabase, payload, commitMessage)
      setUnsavedChanges(false)
      clearLocalDraft()
      setMessage({ type: 'success', text: 'Saved to database. Only the last 5 saves are kept; the oldest is removed when you save again.' })
      setCommitMessage('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save.' })
    } finally {
      setSubmitting(false)
    }
  }, [getAllData, commitMessage])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Data entry</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Commit message (what did you change?)"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--maxin-light)',
              borderRadius: 8,
              fontSize: 14,
              minWidth: 220,
            }}
          />
          <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          style={{
            padding: '10px 20px',
            background: 'var(--maxin-light)',
            color: 'var(--maxin-white)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {message.text && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            fontSize: 14,
            background: message.type === 'error' ? '#fef2f2' : '#e0f4fc',
            color: message.type === 'error' ? '#b91c1c' : 'var(--maxin-dark)',
          }}
        >
          {message.text}
        </div>
      )}

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
            afterChange={(changes, source) => {
              afterChangeWithRecalc(hotRefClient, changes, source)
              if (changes?.length) {
                setUnsavedChanges(true)
                scheduleLocalDraft()
              }
            }}
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
            afterChange={(changes, source) => {
              afterChangeWithRecalc(hotRefPolicy, changes, source)
              if (changes?.length) {
                setUnsavedChanges(true)
                scheduleLocalDraft()
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
