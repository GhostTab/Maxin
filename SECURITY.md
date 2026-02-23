# Security – Red Hat / npm audit overview

This project is scanned by **Red Hat overview of security issues** (and similar tools that use CVE/OSV data). Below is what affects this repo and how to handle it.

---

## What we fixed (done)

- **xlsx (high) removed.** The app no longer uses `xlsx`. Excel export now uses **ExcelJS** (`exceljs`), which has no known high-severity CVEs for our usage (export-only in the browser). This addressed the previous “2 High” Red Hat / npm findings (prototype pollution + ReDoS in xlsx).

---

## Current findings (npm audit)

After the xlsx → exceljs change, `npm audit` may still report vulnerabilities in **transitive** dependencies:

| Source | Severity | Issue | Fix |
|--------|----------|--------|-----|
| **dompurify** (via handsontable) | Moderate | XSS (GHSA-vhxf-7vqr-mrjg) | Upgrade handsontable → 16.x (breaking) |
| **esbuild** (via vite) | Moderate | Dev server request handling (GHSA-67mh-4wv8-2f99) | Upgrade vite → 7.x (breaking) |
| **minimatch/glob** (via exceljs → archiver) | High | ReDoS in minimatch | Transitive; exceljs uses for zip; no safe semver fix without downgrade. |

The **Red Hat “Vendor Issues”** view may still show some of these. The **direct** high-severity issues from the old stack (xlsx) have been removed.

---

## What to do

### 1. Safe updates (no breaking changes)

```bash
npm audit fix
```

Do **not** use `npm audit fix --force` unless you are ready to upgrade major versions (handsontable, vite) and test the app.

### 2. Handsontable (dompurify)

- Fix requires upgrading to Handsontable 16.x (breaking). Plan a dedicated upgrade and test the spreadsheet UI (tabs, save, load).

### 3. Vite (esbuild)

- The esbuild issue affects the **dev server**. For production builds the impact is limited. Fix by upgrading to Vite 7 when you’re ready to handle breaking changes.

---

## Red Hat / CVE summary

- **Red Hat overview** and similar tools list “dependencies affected with CVE” and severity (e.g. 2 High, 1 Medium).
- The previous high-severity entries from `xlsx` are resolved (we use ExcelJS now). Remaining entries correspond to handsontable (dompurify), vite (esbuild), and sometimes exceljs’s transitive deps. Addressing the npm audit items (including breaking upgrades when you’re ready) will update the Red Hat view.
- Re-run `npm audit` and your Red Hat/security dashboard after any dependency change to confirm the status.

---

## Reporting security issues

If you find a security bug in this project, please report it privately (e.g. to the repo owner or your team lead) rather than opening a public issue.
