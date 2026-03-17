# Proposal vs Existing System — Gap Analysis

**Proposal document:** *MAXIN Insurance Digital Archive & Operations System* (Proposal.docx)  
**Existing codebase:** *maxin-insurance-data-system* (this repo)

This document compares the **proposed** system (as described in the Word proposal) with the **current implementation**, from a system-architecture and fullstack perspective.

---

## 1. Executive Summary (Proposal vs Reality)

| Proposal vision | Current system |
|-----------------|----------------|
| **Name:** MAXIN Insurance **Digital Archive & Operations** System | **Name:** MAXIN Insurance **Data** System (client + policy data, Excel export) |
| Digitize client records, **organize insurance documents per service and year**, centralize operational data | Client + policy records in a **single JSONB “submission”**; documents (KYC, policy copy) in one **flat uploads bucket** — no “per service” or “per year” structure |
| Replace manual archiving with **scalable, secure, professional digital infrastructure** | Supabase (PostgreSQL + Auth + Storage), admin-only RLS, single “current” document + 5 version history; no dedicated archive/organization model |

---

## 2. Existing System Features (Proposal’s List) vs Implementation

The proposal lists “Existing System Features (Current Version)”. Below is how each maps to the **actual codebase**.

### 2.1 Client Management

| Proposal feature | In current system? | Notes |
|------------------|--------------------|--------|
| Client registration and profile generation | ✅ Yes | Add Client form; profile = client fields in Data management (detail view). |
| **Unique client identification code** | ⚠️ Partial | No explicit “client code” field in UI or schema. Clients are identified by **array index** and **Full Name** (col_1); no UUID or business code. |
| Editable client information | ✅ Yes | Data management → client detail → Edit (client + linked policies). |
| **Status monitoring** | ⚠️ Partial | Client has a **Status** dropdown (Active, Inactive, etc.); no dedicated “monitoring” dashboard or alerts. |

### 2.2 Service-Based Document Archive

| Proposal feature | In current system? | Notes |
|------------------|--------------------|--------|
| **Organized Type** (document type) | ❌ No | No “document type” or “service type” entity. Only two upload fields: **KYC** (client), **Policy Copy** (policy). |
| Upload, view, download, manage documents | ✅ Yes | Upload via Add Client / Add Policy / Edit; view/download links in detail views; “manage” = edit/delete via Data management. |
| **Structured storage format** | ⚠️ Partial | Files in Supabase Storage `uploads` bucket; paths by `kyc/` and `policy/` prefix. **No** “service-first” or “per service and year” folder/logical structure. |
| **Service-first document association** | ❌ No | No “service” entity. Policies have **Provider** and **Line**, but documents are not grouped by “service” or “year”. |
| **Multiple services per client** | ❌ No | Model is “client + policies”; no first-class “services” or “document types” per client. |

### 2.3 Secure Cloud Storage

| Proposal feature | In current system? | Notes |
|------------------|--------------------|--------|
| Structured storage architecture | ⚠️ Partial | Supabase Storage, single bucket; structure is flat (kyc/policy). |
| **Private document access** | ⚠️ Different | Bucket is **public** (so file URLs work); RLS restricts **who** can list/upload (admin only). Proposal implies “private” access; current is “admin-only upload, public read for links”. |
| Controlled permissions | ✅ Yes | RLS: only `app_metadata.role = 'admin'` can read/write submissions and storage. |

### 2.4 Dashboard Overview

| Proposal feature | In current system? | Notes |
|------------------|--------------------|--------|
| Operational summary | ✅ Yes | Dashboard: total clients, total policies, sum insured, gross premium. |
| Client and **document** statistics | ⚠️ Partial | Client and **policy** stats only; no “document” counts or document-type breakdown. |
| **Expandable architecture for monitoring modules** | ❌ No | No plug-in or “monitoring module” extension point; single dashboard with fixed charts (by provider, by status). |

### 2.5 Audit Logging

| Proposal feature | In current system? | Notes |
|------------------|--------------------|--------|
| Tracks user actions | ❌ No | No application-level audit log (who did what, when). Submissions store `submitted_at` and optional `message`; no “user_id” or action type. |
| Records system activity for compliance and monitoring | ❌ No | No audit UI or audit table. Supabase may log DB access, but no in-app “Audit Logging” module. |

### 2.6 Meeting & Activity Module

| Proposal feature | In current system? | Notes |
|------------------|--------------------|--------|
| Schedule tracking | ❌ No | No calendar, events, or schedule. |
| Upcoming events monitoring | ❌ No | No meetings or activities module. |

---

## 3. Process Flow: Proposal vs Current

**Proposal’s workflow:**  
Client Creation → **Service Assignment per Client** → **Document Upload (Service Document Type)** → Secure Storage → **Profile Viewing & Search** → **Monitoring & Dashboard Reporting**

**Current system flow:**  
Add Client → Add Policy (linked to client) → Data stored in single “current” submission (client_info + policy_info) → **Data management** (list, filter, client/policy detail, edit, delete) → **Spreadsheet** (read-only) → **Dashboard** (aggregate stats + charts) → **Export to Excel**

**Gaps:**

- No **“Service Assignment per Client”** step or entity.
- No **“Document Upload (Service Document Type)”** — only KYC and Policy Copy, not categorized by service/type.
- **Profile viewing & search:** Search exists as a **filter** in Data management (by name, email, contact, policy no., provider, line); no dedicated “Profile Viewing & Search” module or full-text search.
- **Monitoring & reporting:** Dashboard + expiry reminders (see below); no generic “monitoring modules” or reporting builder.

---

## 4. Security, Storage, and Database

### 4.1 Security (Proposal vs Current)

| Proposal | Current |
|----------|---------|
| HTTPS, RBAC, admin-restricted, audit logs, private document storage | HTTPS (host-dependent); RLS = admin-only for submissions and storage; **no** in-app audit log; storage **public** for read (links). |
| **Recommended:** 2FA, daily backups, login attempt monitoring, IP restriction | No 2FA; backups/monitoring/IP are Supabase/host concerns, not implemented in app. |

### 4.2 Storage

| Proposal | Current |
|----------|---------|
| **Cloud:** e.g. Cloudflare Object Storage; structured; scalable; encrypted. **Offline:** On-prem server, local PostgreSQL, NAS, internal network. | **Supabase Storage** (cloud); single bucket; no “per service/year” structure; no on-prem option in app. |

### 4.3 Database

| Proposal | Current |
|----------|---------|
| PostgreSQL; structured schema; **client–service relationship**; migration-based; backup-ready. | **PostgreSQL (Supabase)**; **single JSONB document** (submissions.data: client_info[], policy_info[]); no normalized client/service/document tables; schema migrations in SQL files. |

---

## 5. What Exists in Code but Is Not in the Proposal

- **Expiry reminders:** Edge Function `send-expiry-reminders` (SMS via Semaphore, email via Resend/Gmail) for policies expiring in 30 days; table `expiry_reminders_sent`. Not mentioned in the proposal.
- **Excel export:** Download current client + policy data as `.xlsx`. Proposal does not list this explicitly.
- **Forgot / Reset password:** Auth flows exist; proposal does not detail them.
- **Version history:** Up to 5 previous “submissions” kept when saving; no UI to browse or revert (only “current” is used).

---

## 6. Summary Table: Feature Presence

| Area | Proposal (existing system description) | Current implementation |
|------|----------------------------------------|-------------------------|
| **Client management** | Registration, profile, unique code, editable, status monitoring | ✅ Registration, profile, edit; ⚠️ no unique client code; ⚠️ status field only |
| **Document archive** | Service-based, organized type, upload/view/download, service-first, multiple services per client | ❌ No service/document type; ✅ upload/view/download; ❌ no service-first or multiple services |
| **Storage** | Structured, private, controlled | ⚠️ Structured but flat; ⚠️ public bucket, admin-only write |
| **Dashboard** | Summary, client & document stats, expandable monitoring | ✅ Summary + policy stats; ❌ no document stats; ❌ no monitoring modules |
| **Audit logging** | User actions, compliance/monitoring | ❌ Not implemented |
| **Meeting & Activity** | Schedule, upcoming events | ❌ Not implemented |
| **Process flow** | Service assignment, document type upload, profile search, monitoring/reporting | ❌ No service assignment or document type; ⚠️ filter search only; ✅ basic reporting (dashboard + export) |
| **Security** | 2FA, backups, login monitoring, IP (recommended) | ❌ Not in app |
| **Extras in code** | — | ✅ Expiry reminders (SMS/email); ✅ Excel export; ✅ Forgot/Reset password |

---

## 7. Recommendations (Architectural)

1. **Align naming and scope:** Decide whether the product is “Data System” (current) or “Digital Archive & Operations System” (proposal); update proposal or roadmap accordingly.
2. **Introduce “Service” and “Document Type”** if the proposal’s “service-based document archive” is required: add entities (e.g. services, document types), link clients to services, and store documents by client + service + type/year.
3. **Storage structure:** If “per service and year” is required, extend Storage layout (e.g. `client_id/service/year/`) and/or add metadata tables; consider private buckets + signed URLs if “private document access” is mandatory.
4. **Audit logging:** Add an audit table (user_id, action, resource, timestamp) and optional UI for compliance.
5. **Unique client identification:** Add a stable client identifier (e.g. UUID or business code) and use it in UI and relations.
6. **Meeting & Activity module:** Treat as new scope; not present in current codebase.
7. **Security enhancements:** 2FA, login monitoring, and IP restrictions are outside current app code; implement via Supabase Auth and/or hosting.

This gap analysis reflects the state of the **codebase** and the **Proposal.docx** content as of the scan. For a signed-off scope, reconcile this with the formal proposal and any change requests.
