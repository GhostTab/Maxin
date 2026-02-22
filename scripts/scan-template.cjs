const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

let templatePath = path.join(__dirname, '..', 'template.xlsx')
if (!fs.existsSync(templatePath)) {
  templatePath = path.join(__dirname, '..', 'MAXIN Insurance Data (1).xlsx')
}
if (!fs.existsSync(templatePath)) {
  console.error('template.xlsx or MAXIN Insurance Data (1).xlsx not found in project root')
  process.exit(1)
}

const workbook = XLSX.readFile(templatePath)
const result = {}
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName]
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headers = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })]
    const title = cell ? (cell.w || String(cell.v ?? '').trim()) : `Column ${c + 1}`
    const data = 'col_' + (c + 1)
    headers.push({ data, title: title || data, type: 'text' })
  }
  result[sheetName] = headers
}
console.log(JSON.stringify(result, null, 2))
