# MAXIN Insurance Data System

Web-based data entry and management for MAXIN Insurance: client info, policy info, and Excel export. Built with React (Vite), Supabase (auth + database), and Handsontable for read-only spreadsheet view.

---

## Stack

| Layer        | Tech                          |
| ------------ | ----------------------------- |
| **Frontend** | React 18, Vite, React Router   |
| **Backend**  | Supabase (PostgreSQL, Auth)   |
| **Spreadsheet** | Handsontable (non-commercial) |
| **Export**   | xlsx (Excel download)         |

---

## Quick start (everyone)

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase-schema.sql` to create the `submissions` table and RLS.
3. In **Authentication → Users**, create one admin user (email + password). No sign-up; only this user can log in.
4. In **Storage**, create buckets `uploads` (or use the names in the schema) for KYC and policy file uploads.
5. In **Project Settings → API**, copy **Project URL** and **anon public** key.
6. For **Forgot password** to work: in **Authentication → URL Configuration**, add your app’s reset page to **Redirect URLs**, e.g. `http://localhost:5173/reset-password` and `https://your-domain.com/reset-password`.

### 2. App env

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173) and log in with your Supabase admin user.

---

## Guide for frontend developers

This section is for the frontend dev enhancing the UI. Backend (Supabase), auth, and data shape are already in place; you can focus on layout, components, and styling.

### What’s already there

- **Auth:** Login page; protected routes; logout from sidebar.
- **Sidebar layout:** Left nav (Add record, Spreadsheet, Data management); main content on the right.
- **Pages:**
  - **Add record** – Form for one client + one policy; validation (all fields required); submit adds to current submission.
  - **Data management** – List of clients (from current submission); click a client → detail view; **Edit** opens edit form for that client and their policies; save updates the current submission.
  - **Spreadsheet** – Handsontable tabs (Client Info / Policy Info); read-only view of current submission.
- **Design:** CSS variables in `src/index.css` (colors, radii, shadows, sidebar). Reusable classes: `.page-content`, `.page-heading`, `.card`, `.btn`, `.btn-primary`, `.btn-ghost`, `.alert`, `.form-actions`, etc.

### Repo structure (what to touch)

```
src/
├── index.css          # Global styles, design tokens (--maxin-dark, --sidebar-bg, etc.)
├── App.jsx            # Routes; protect layout with auth
├── main.jsx
├── components/
│   ├── Layout.jsx     # Sidebar + main; nav links; logout
│   └── RecordForm.jsx  # Shared FormSection for Add/Edit (client & policy fields)
├── config/
│   └── spreadsheetColumns.js   # Column definitions; add/change fields here if needed
├── context/
│   └── UnsavedContext.jsx      # Tracks unsaved changes (e.g. spreadsheet)
├── lib/
│   ├── supabase.js    # Supabase client (uses .env)
│   ├── submissions.js # getCurrentSubmission, saveCurrent
│   ├── exportExcel.js # Download current data as .xlsx
│   └── upload.js      # File upload to Supabase Storage
└── pages/
    ├── Login.jsx
    ├── AddRecord.jsx
    ├── DataManagement.jsx   # List, client detail, edit client
    └── Spreadsheet.jsx      # Handsontable (read-only)
```

- **Styling:** Prefer editing `src/index.css` and using existing classes. Layout and pages use a mix of those classes and inline `style` where needed; you can replace inline styles with classes or a CSS-in-JS approach if you prefer.
- **New UI only:** Safe to change components, `index.css`, and page JSX. Avoid changing `src/lib/*` and `src/config/spreadsheetColumns.js` unless you’re adding fields or changing data flow.

### Design tokens (index.css)

Use these so the app stays consistent:

- **Colors:** `--maxin-dark`, `--maxin-accent`, `--maxin-light`, `--maxin-bg`, `--sidebar-bg`, `--sidebar-text`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--input-border`, `--card-bg`
- **Spacing / radius:** `--radius-md`, `--radius-lg`, `--radius-xl`, `--space-card`
- **Shadows:** `--shadow-card`, `--shadow-elevated`

Font: **DM Sans** (from Google Fonts in `index.css`). You can swap it or add a second font for headings.

### Running and building

```bash
npm install
npm run dev      # Dev server (e.g. http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

### Environment

The app needs a `.env` (from `.env.example`) with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Your frontend partner can use a shared Supabase project or their own for local work; same schema and one admin user are enough.

### Suggested enhancements (non-exhaustive)

- Responsive sidebar (e.g. collapse on small screens, hamburger menu).
- Improve forms: better error messages, inline validation, accessibility (labels, focus, ARIA).
- Data management: table view, sorting, pagination, or better empty states.
- Theming: dark mode or alternate palette using the same CSS variables.
- Replace or reduce inline `style` with a small design system (e.g. more classes or a UI library that fits the tokens).

---

## Customizing columns / data shape

Client and policy fields are defined in `src/config/spreadsheetColumns.js`:

- `SPREADSHEET_COLUMNS.Client_Info` and `Policy_Info`: array of `{ data, title, type, inputType?, options? }`.
- `inputType`: `'text' | 'email' | 'tel' | 'date' | 'number' | 'select'`. For `select`, use `options` (e.g. `NATIONALITY_OPTIONS`).
- Upload fields are listed in `UPLOAD_FIELD_KEYS`; they store a URL after upload.

If you add or rename columns, update this config and the Supabase schema if you added DB columns (the app stores a single JSON `data` payload for the current submission, so schema changes are only needed if you move to normalized tables later).

---

## Build and deploy

```bash
npm run build
```

Output is in `dist/`. Deploy that folder to any static host (Vercel, Netlify, etc.) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host’s environment.

---

## License

Private. Handsontable is non-commercial; check license if you use it in a commercial product.
