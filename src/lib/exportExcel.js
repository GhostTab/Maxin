/**
 * Export current submission data (client_info + policy_info) to an .xlsx file.
 * Uses column titles from spreadsheetColumns for sheet headers.
 */

import * as XLSX from 'xlsx'
import { SPREADSHEET_COLUMNS } from '../config/spreadsheetColumns'

function rowToSheetRow(columns, row) {
  const out = {}
  columns.forEach((col, i) => {
    out[col.title] = row[col.data] ?? ''
  })
  return out
}

/**
 * @param {object} currentSubmission - { data: { client_info: [], policy_info: [] } }
 * @param {string} [filename] - e.g. 'maxin-data.xlsx' or with date
 */
export function exportCurrentToExcel(currentSubmission, filename) {
  const data = currentSubmission?.data || {}
  const clientInfo = Array.isArray(data.client_info) ? data.client_info : []
  const policyInfo = Array.isArray(data.policy_info) ? data.policy_info : []

  const clientCols = SPREADSHEET_COLUMNS.Client_Info
  const policyCols = SPREADSHEET_COLUMNS.Policy_Info

  const clientRows = clientInfo.map((row) => rowToSheetRow(clientCols, row))
  const policyRows = policyInfo.map((row) => rowToSheetRow(policyCols, row))

  const wsClient = XLSX.utils.json_to_sheet(clientRows.length ? clientRows : [{}])
  const wsPolicy = XLSX.utils.json_to_sheet(policyRows.length ? policyRows : [{}])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsClient, 'Client_Info')
  XLSX.utils.book_append_sheet(wb, wsPolicy, 'Policy_Info')

  const name = filename || `maxin-data-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, name)
}
