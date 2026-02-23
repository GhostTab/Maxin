/**
 * Export current submission data (client_info + policy_info) to an .xlsx file.
 * Uses ExcelJS (no known high-severity CVEs). Column titles from spreadsheetColumns.
 */

import ExcelJS from 'exceljs'
import { SPREADSHEET_COLUMNS } from '../config/spreadsheetColumns'

function rowToSheetRow(columns, row) {
  const out = {}
  columns.forEach((col) => {
    out[col.title] = row[col.data] ?? ''
  })
  return out
}

/**
 * @param {object} currentSubmission - { data: { client_info: [], policy_info: [] } }
 * @param {string} [filename] - e.g. 'maxin-data.xlsx' or with date
 */
export async function exportCurrentToExcel(currentSubmission, filename) {
  const data = currentSubmission?.data || {}
  const clientInfo = Array.isArray(data.client_info) ? data.client_info : []
  const policyInfo = Array.isArray(data.policy_info) ? data.policy_info : []

  const clientCols = SPREADSHEET_COLUMNS.Client_Info
  const policyCols = SPREADSHEET_COLUMNS.Policy_Info

  const clientRows = clientInfo.map((row) => rowToSheetRow(clientCols, row))
  const policyRows = policyInfo.map((row) => rowToSheetRow(policyCols, row))

  const workbook = new ExcelJS.Workbook()
  const wsClient = workbook.addWorksheet('Client_Info')
  const wsPolicy = workbook.addWorksheet('Policy_Info')

  if (clientRows.length) {
    const keys = clientCols.map((c) => c.title)
    wsClient.columns = keys.map((k) => ({ header: k, key: k, width: 14 }))
    wsClient.addRows(clientRows)
  } else {
    wsClient.columns = clientCols.map((c) => ({ header: c.title, key: c.title, width: 14 }))
    wsClient.addRow({})
  }

  if (policyRows.length) {
    const keys = policyCols.map((c) => c.title)
    wsPolicy.columns = keys.map((k) => ({ header: k, key: k, width: 14 }))
    wsPolicy.addRows(policyRows)
  } else {
    wsPolicy.columns = policyCols.map((c) => ({ header: c.title, key: c.title, width: 14 }))
    wsPolicy.addRow({})
  }

  const name = filename || `maxin-data-${new Date().toISOString().slice(0, 10)}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
