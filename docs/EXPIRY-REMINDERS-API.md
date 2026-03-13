# Expiry reminders – API reference and setup steps

This document describes the **send-expiry-reminders** Edge Function API and the steps to set it up. The function sends **SMS** (Semaphore) and **email** (Gmail or Resend) for two reminder types:

1. **30 days before expiry** – one SMS + email when the policy’s Expiry Date is exactly 30 days from today.
2. **On expiry date (today)** – one SMS + email when the policy’s Expiry Date is today (already expired / expiring today).

Each type is sent **once per policy**; state is stored in `expiry_reminders_sent`.

---

## Table of contents

1. [API reference](#1-api-reference)
2. [Secrets (environment variables)](#2-secrets-environment-variables)
3. [Setup steps](#3-setup-steps)
4. [Scheduling (cron)](#4-scheduling-cron)
5. [Gmail setup](#5-gmail-setup)
6. [Testing](#6-testing)
7. [Response reference](#7-response-reference)
8. [Troubleshooting](#8-troubleshooting)
9. [Data sources](#9-data-sources)

---

## 1. API reference

### Endpoint

| Property | Value |
|----------|--------|
| **URL** | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders` |
| **Method** | `POST` (use POST for cron; GET may work but is not recommended) |
| **Auth** | Required. Supabase anon or service role key in `Authorization` header. |

Replace `YOUR_PROJECT_REF` with your project’s Reference ID (Supabase Dashboard → Project Settings → General).

### Headers

| Header | Required | Value |
|--------|----------|--------|
| `Authorization` | Yes | `Bearer YOUR_ANON_KEY` or `Bearer YOUR_SERVICE_ROLE_KEY` |
| `Content-Type` | No | Optional; no body required. |

Get **YOUR_ANON_KEY** from Dashboard → Project Settings → API → **anon** public.

### Query parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `today` | No | Override “today” for matching policies. Format: `YYYY-MM-DD` (e.g. `?today=2026-03-13`). Use a date that matches a policy’s **Expiry date** to test. |
| `force` | No | Resend even if a reminder was already sent for that policy. Values: `true` or `1`. Use for repeated testing. |

**Examples:**

- No params: use server’s UTC date as “today”.
- `?today=2026-03-13`: only policies with Expiry date **2026-03-13** are considered.
- `?today=2026-03-13&force=true`: same as above, and send again even if already sent.

### Response

- **Status:** `200` on success (even when no policies expire or nothing is sent).
- **Body:** JSON. See [Response reference](#7-response-reference).

---

## 2. Secrets (environment variables)

Secrets are **project-wide** (Supabase Dashboard → Edge Functions → **Secrets**), not per function.

### Required for SMS

| Secret | Description |
|--------|-------------|
| `SEMAPHORE_API_KEY` | Your Semaphore API key (from [semaphore.co](https://semaphore.co)). |

### Required for email (choose one)

**Option A – Gmail (recommended if you use Gmail)**

| Secret | Description |
|--------|-------------|
| `GMAIL_CLIENT_ID` | OAuth 2.0 Client ID (Google Cloud). |
| `GMAIL_CLIENT_SECRET` | OAuth 2.0 Client secret. |
| `GMAIL_REFRESH_TOKEN` | Refresh token from OAuth 2.0 Playground (scope: `gmail.send`). |
| `GMAIL_FROM_EMAIL` | Sender address, e.g. `you@gmail.com`. |

**Option B – Resend**

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Your Resend API key. |
| `RESEND_FROM` | Optional. Sender, e.g. `MAXIN Insurance <onboarding@resend.dev>`. |

If both Resend and Gmail are set, **Resend** is used. To use Gmail only, do not set `RESEND_API_KEY`.

### CLI examples

```bash
# SMS (required)
npx supabase secrets set SEMAPHORE_API_KEY=your_semaphore_key

# Gmail (optional)
npx supabase secrets set GMAIL_CLIENT_ID=your_client_id
npx supabase secrets set GMAIL_CLIENT_SECRET=your_client_secret
npx supabase secrets set GMAIL_REFRESH_TOKEN=your_refresh_token
npx supabase secrets set GMAIL_FROM_EMAIL=you@gmail.com
```

---

## 3. Setup steps

### Step 1: Database (once)

Create the table that tracks which reminders were sent (for both "30 days before" and "expiry day").

1. Open **Supabase Dashboard** → **SQL Editor**.
2. Paste and run **`supabase-expiry-reminders-table.sql`** (creates `expiry_reminders_sent` and RLS).
3. Paste and run **`supabase-expiry-reminders-30day-columns.sql`** (adds `sms_30day_sent_at`, `email_30day_sent_at` for the 30-day reminder).

### Step 2: Deploy the Edge Function

From the project root:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy send-expiry-reminders
```

Use **YOUR_PROJECT_REF** from Dashboard → Project Settings → General → Reference ID.

### Step 3: Set secrets

1. In **Supabase Dashboard** → **Edge Functions** → **Secrets** (or use the CLI above).
2. Set **SEMAPHORE_API_KEY** (required for SMS).
3. For email, set either the four **Gmail** secrets or **Resend** secrets (see [Secrets](#2-secrets-environment-variables)).

No redeploy is needed after changing secrets.

### Step 4: Schedule the function (cron)

The function runs only when its URL is called. To send reminders automatically:

- Use an external cron (e.g. [cron-job.org](https://cron-job.org)): **POST** to the function URL **daily**, with header `Authorization: Bearer YOUR_ANON_KEY`.
- Or use Supabase **pg_cron** + **pg_net** if available (see [Scheduling](#4-scheduling-cron)).

Important: use **POST**, not GET, and always send the **Authorization** header.

### Step 5: Save data after adding policies

The function uses the **latest submission only** (most recent row in `submissions`). After adding or editing a policy in the app, **Save/Submit** so the latest submission includes it.

---

## 4. Scheduling (cron)

### Option A: cron-job.org

1. Go to [cron-job.org](https://cron-job.org) and create a job.
2. **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders`
3. **Method:** **POST**
4. **Headers:** Add `Authorization` = `Bearer YOUR_ANON_KEY`
5. **Schedule:** Daily at a fixed time (e.g. 8:00 AM).

### Option B: Supabase pg_cron

1. In **Supabase → Database → Extensions**, enable **pg_cron** and **pg_net**.
2. In **SQL Editor**, run (replace URL and key):

```sql
SELECT cron.schedule(
  'expiry-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

## 5. Gmail setup

To send email from your Gmail account:

1. Follow **[docs/GMAIL-SETUP.md](GMAIL-SETUP.md)** to:
   - Enable Gmail API and create an OAuth **Web application** client.
   - Add redirect URI `https://developers.google.com/oauthplayground`.
   - Add your Gmail as a **Test user** (if consent screen is in Testing).
   - Get a **refresh token** via OAuth 2.0 Playground (scope: `https://www.googleapis.com/auth/gmail.send`).
2. Set the four secrets in Supabase (see [Secrets](#2-secrets-environment-variables)).
3. Do **not** set `RESEND_API_KEY` if you want to use Gmail only.

---

## 6. Testing

### Manual trigger (PowerShell)

```powershell
# Use server’s “today”
Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders" -Method Post -Headers @{ "Authorization" = "Bearer YOUR_ANON_KEY" }

# Override date and force resend
Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders?today=2026-03-13&force=true" -Method Post -Headers @{ "Authorization" = "Bearer YOUR_ANON_KEY" }
```

### Manual trigger (curl)

```bash
# Basic
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# With date and force
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders?today=2026-03-13&force=true" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

On Windows PowerShell, use `curl.exe` if the above `curl` is aliased to `Invoke-WebRequest`.

### What to verify

- **Supabase → Edge Functions → send-expiry-reminders → Logs:** Look for `[send-expiry-reminders]` lines (submission_id, serverToday, expiringToday, expiringIn30Days, done summary).
- **Response JSON:** Check `debug.expiringTodayCount`, `debug.expiringIn30DaysCount`, `debug.emailProvider`, `results[].reminderType`, `results[].sms`, `results[].email`.
- **Table Editor → expiry_reminders_sent:** Confirm rows after a successful send.

---

## 7. Response reference

### Success (HTTP 200)

```json
{
  "ok": true,
  "message": "Processed N expiring today + M expiring in 30 days",
  "debug": {
    "serverTodayUTC": "2026-03-13",
    "forceResend": false,
    "totalPolicies": 13,
    "expiringTodayCount": 1,
    "expiringIn30DaysCount": 1,
    "tip": null,
    "emailProvider": "gmail",
    "emailSecretsHint": null,
    "gmailSecretsSet": { "clientId": true, "clientSecret": true, "refreshToken": true, "fromEmail": true },
    "clientNames": ["Maria Santos", "Juan Dela Cruz", ...],
    "allExpiryDates": [
      { "policyNo": "POL-001", "expiry": "2026-03-13", "normalized": "2026-03-13", "col_1": "...", "col_2": "..." }
    ]
  },
  "results": [
    {
      "reminderType": "today",
      "policyNo": "8989797",
      "insuredName": "Pingal, Loren Lloyd B.",
      "expiryStored": "2026-03-13",
      "matchedClient": true,
      "phoneLast4": "4524",
      "sms": "sent",
      "email": "sent"
    }
  ],
  "emailConfigured": true
}
```

### Main fields

| Field | Description |
|-------|-------------|
| `debug.serverTodayUTC` | Date used as “today” (UTC or `?today=` override). |
| `debug.expiringTodayCount` | Number of policies whose expiry date is today. |
| `debug.expiringIn30DaysCount` | Number of policies whose expiry date is 30 days from today. |
| `debug.emailProvider` | `"resend"` \| `"gmail"` \| `"none"`. |
| `debug.allExpiryDates` | All policies with expiry and normalized date; use for `?today=`. |
| `debug.tip` | Hint when nothing was sent (e.g. use `?today=` or `?force=true`). |
| `results[]` | One entry per policy in either "expiring today" or "expiring in 30 days". |
| `results[].reminderType` | `"30day"` (30 days before) or `"today"` (expiry day). |
| `results[].sms` | `"sent"` \| `"already_sent"` \| `"no_phone"` \| or error. |
| `results[].email` | `"sent"` \| `"already_sent"` \| `"no_email"` \| `"no_email_key"` \| or error. |
| `results[].matchedClient` | `true` if a client was found for SMS/email. |

### No submission (HTTP 200, error body)

```json
{
  "error": "No submission found",
  "detail": "..."
}
```

### Missing secret (HTTP 500)

```json
{
  "error": "Missing SEMAPHORE_API_KEY. Set it in Edge Function secrets."
}
```

---

## 8. Troubleshooting

| Issue | What to do |
|-------|------------|
| **Nothing sends** | Ensure you **Saved** after adding the policy (function uses latest submission only). Use `?today=YYYY-MM-DD` with a date from `debug.allExpiryDates`. Use `?force=true` to resend. |
| **No reminders sent** | No policy has Expiry date = today or today+30 days. Add policies and Save, or call with `?today=` set to an expiry you have. |
| **`sms: "already_sent"`** | Reminder was already sent for that policy. Use `?force=true` to resend for testing. |
| **`matchedClient: false`** | Policy’s Full Name / Insured Name doesn’t match any Client **Full Name**. Align names in Client Info and Policy Info. |
| **`sms: "no_phone"`** | Client has no **Contact No** (col_8) or invalid format. Use 10-digit PH or 63xxxxxxxxx. |
| **`email: "no_email"`** | Client has no **Email** (col_7) or invalid. |
| **`emailProvider` is "resend" but you want Gmail** | Remove `RESEND_API_KEY` (and `RESEND_FROM`) so Gmail is used. |
| **`email: "gmail_token_failed: ..."`** | Refresh token invalid/expired. Get a new token from OAuth Playground and set `GMAIL_REFRESH_TOKEN`. |
| **Cron returns 401** | Use **POST** and send header `Authorization: Bearer YOUR_ANON_KEY`. |
| **Cron runs but no SMS/email** | Check Edge Function **Logs** for `[send-expiry-reminders]` to see `expiringCount`, `allExpiries`, and per-policy `sms`/`email` in the “done” line. |

---

## 9. Data sources

The function reads from the **latest** row in `submissions` (by `submitted_at` desc). From `submission.data` it uses:

| Purpose | Source |
|--------|--------|
| Policy expiry | **Policy Info** → Expiry Date (col_8) |
| Client match | Policy’s Full Name (col_1) / Insured Name (col_2) matched to **Client Info** → Full Name (col_1) |
| SMS | **Client Info** → Contact No (col_8), normalized to Philippine format (e.g. 63xxxxxxxxx) |
| Email | **Client Info** → Email (col_7) |

Two reminder types are sent at most **once per policy** each: (1) 30 days before expiry (`sms_30day_sent_at` / `email_30day_sent_at`), (2) on expiry day (`sms_sent_at` / `email_sent_at`). State is stored in `expiry_reminders_sent`.

---

## Related docs

- **[docs/EXPIRY-REMINDERS.md](EXPIRY-REMINDERS.md)** – Feature overview and quick reference.
- **[docs/GMAIL-SETUP.md](GMAIL-SETUP.md)** – Gmail OAuth and refresh token steps.
