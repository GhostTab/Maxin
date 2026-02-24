/**
 * Column config from Excel template (template.xlsx) – both tabs.
 * Scanned via: node scripts/scan-template.cjs
 */

export const SHEET_NAMES = ['Client_Info', 'Policy_Info']

/** Column keys that are file uploads (store URL after upload). */
export const UPLOAD_FIELD_KEYS = {
  Client_Info: ['col_16'],   // Upload KYC
  Policy_Info: ['col_18'],   // Upload Policy Copy
}

/** Options for Nationality dropdown (select). */
export const NATIONALITY_OPTIONS = [
  'Filipino', 'American', 'British', 'Australian', 'Canadian', 'Japanese', 'Chinese', 'Korean',
  'Indian', 'Indonesian', 'Malaysian', 'Singaporean', 'Thai', 'Vietnamese', 'Spanish', 'German',
  'French', 'Italian', 'Dutch', 'Irish', 'New Zealander', 'South African', 'Brazilian', 'Mexican',
  'Argentine', 'Colombian', 'Russian', 'Saudi', 'Emirati', 'Pakistani', 'Bangladeshi', 'Nigerian',
  'Egyptian', 'Kenyan', 'Ghanaian', 'Other',
]

/** Status options for Client and Policy (select). */
export const STATUS_OPTIONS = [
  'Active',
  'Inactive',
  'Pending',
  'Expired',
  'Cancelled',
  'Lapsed',
  'Renewed',
]

/** MAXIN providers for Policy Provider dropdown (select). */
export const PROVIDER_OPTIONS = [
  'AXA',
  'ATR FAMi',
  'Pioneer Your Insurance',
  'BETHEL-general insurance and surety corporation',
  'MALAYAN INSURANCE',
  'BPI MS INSURANCE',
  'STRONGHOLD-insurance company, incorporated',
  'Prudential Guarantee- Insuring growth',
  'Intellicare',
  'Maxicare',
  'MediCard-precribe by doctors',
]

/** HTML input type for form fields: date (calendar), email, tel, number, or text. */
export const SPREADSHEET_COLUMNS = {
  Client_Info: [
    { data: 'col_1', title: 'Full Name', type: 'text' },
    { data: 'col_2', title: 'First Name', type: 'text' },
    { data: 'col_3', title: 'Middle Name', type: 'text' },
    { data: 'col_4', title: 'Last Name', type: 'text' },
    { data: 'col_5', title: 'Suffix', type: 'text' },
    { data: 'col_6', title: 'TIN', type: 'text' },
    { data: 'col_7', title: 'Email', type: 'text', inputType: 'email' },
    { data: 'col_8', title: 'Contact No', type: 'text', inputType: 'tel' },
    { data: 'col_9', title: 'Birthday', type: 'text', inputType: 'date' },
    { data: 'col_10', title: 'Birth Place', type: 'text' },
    { data: 'col_11', title: 'Nationality', type: 'text', inputType: 'select', options: NATIONALITY_OPTIONS },
    { data: 'col_12', title: 'Country', type: 'text' },
    { data: 'col_13', title: 'City', type: 'text' },
    { data: 'col_14', title: 'Zip Code', type: 'text' },
    { data: 'col_15', title: 'Full Address', type: 'text' },
    { data: 'col_16', title: 'Upload KYC', type: 'text' },
    { data: 'col_17', title: 'Status', type: 'text', inputType: 'select', options: STATUS_OPTIONS },
  ],
  Policy_Info: [
    { data: 'col_1', title: 'Full Name', type: 'text' },
    { data: 'col_2', title: 'Insured Name', type: 'text' },
    { data: 'col_3', title: 'Policy No', type: 'text' },
    { data: 'col_4', title: 'Provider', type: 'text', inputType: 'select', options: PROVIDER_OPTIONS },
    { data: 'col_5', title: 'Line', type: 'text' },
    { data: 'col_6', title: 'Issued Date', type: 'text', inputType: 'date' },
    { data: 'col_7', title: 'Inception Date', type: 'text', inputType: 'date' },
    { data: 'col_8', title: 'Expiry Date', type: 'text', inputType: 'date' },
    { data: 'col_9', title: 'Status', type: 'text', inputType: 'select', options: STATUS_OPTIONS },
    { data: 'col_10', title: 'Sum Insured', type: 'text', inputType: 'number' },
    { data: 'col_11', title: 'Gross Premium', type: 'text', inputType: 'number' },
    { data: 'col_12', title: 'Basic Premium', type: 'text', inputType: 'number' },
    { data: 'col_13', title: 'Commision', type: 'text', inputType: 'number' },
    { data: 'col_14', title: 'Withholding Tax', type: 'text', inputType: 'number' },
    { data: 'col_15', title: 'VAT', type: 'text', inputType: 'number' },
    { data: 'col_16', title: 'Discount', type: 'text', inputType: 'number' },
    { data: 'col_17', title: 'Net commision', type: 'text', inputType: 'number', readOnly: true },
    { data: 'col_18', title: 'Upload Policy Copy', type: 'text' },
  ],
}

export function getHandsontableColumns(sheetName) {
  const cols = SPREADSHEET_COLUMNS[sheetName] || SPREADSHEET_COLUMNS.Client_Info
  return cols.map((col) => ({
    data: col.data,
    title: col.title,
    type: col.type === 'numeric' ? 'numeric' : 'text',
  }))
}

/** Form-friendly list: { key, title, type } for form rendering. */
export function getFormFields(sheetName) {
  const cols = SPREADSHEET_COLUMNS[sheetName] || SPREADSHEET_COLUMNS.Client_Info
  return cols.map((col) => ({
    key: col.data,
    title: col.title,
    type: col.type === 'numeric' ? 'number' : 'text',
  }))
}
