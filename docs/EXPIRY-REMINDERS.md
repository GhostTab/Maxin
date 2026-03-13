# Expiry reminders (SMS + Emails)

This feature sends **SMS** (via Semaphore) and **email** (via Gmail or Resend) to clients when their policy expires (or N days before). For full **API reference and step-by-step setup**, see **[docs/EXPIRY-REMINDERS-API.md](EXPIRY-REMINDERS-API.md)**.

## What runs

- **Supabase Edge Function** `send-expiry-reminders`: reads the current submission, finds policies whose **Expiry Date** (Policy Info, col_8) is in the next 30 days, matches each policy to a client (by Full Name / Insured Name) for phone and email, sends one SMS and one email per client (if not already sent), and records sends in `expiry_reminders_sent` so we don’t send again the next day.

## 1. Database: tracking table

Run this in **Supabase → SQL Editor** (once):

```bash
# File: supabase-expiry-reminders-table.sql
```

Paste and run the contents of `supabase-expiry-reminders-table.sql` from the project root. This creates `expiry_reminders_sent` and RLS so the Edge Function (service role) can insert/update and authenticated users can read.

## 2. Edge Function: deploy and secrets

1. **Install Supabase CLI** (if needed):  
   https://supabase.com/docs/guides/cli  
   Or: `npm install -g supabase` (or use `npx supabase` without installing).

2. **Log in and link project** (from project root):
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   Find **YOUR_PROJECT_REF** in Supabase Dashboard → Project Settings → General → Reference ID.

3. **Set secrets** (Dashboard or CLI):
   - **Dashboard:** Secrets are **project-wide**, not per function.
     1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
     2. In the **left sidebar**, click **Edge Functions**.
     3. On the Edge Functions page, open the **Secrets** section (tab or link — sometimes labeled "Secrets" or "Environment variables").  
        Direct link format: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions/secrets` (replace `YOUR_PROJECT_REF` with your project’s Reference ID).
     4. Click **Add new secret** (or similar). **Name:** `SEMAPHORE_API_KEY`, **Value:** your real Semaphore API key (not the word "semaphore"). Save.
     5. (Optional) For **email**: either **Resend** (`RESEND_API_KEY`, `RESEND_FROM`) or **Gmail** (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM_EMAIL`). See **Gmail setup** below.
   - **CLI (alternative):** From project root, run:
     ```bash
     npx supabase secrets set SEMAPHORE_API_KEY=your_actual_semaphore_api_key
     ```

4. **Deploy the function** (from project root):
   ```bash
   npx supabase functions deploy send-expiry-reminders
   ```
   Note the URL shown, e.g. `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders`.

## 2b. Deploy and test (quick reference)

| Step | Command / action |
|------|------------------|
| 1. Run tracking table (once) | Supabase Dashboard → SQL Editor → paste `supabase-expiry-reminders-table.sql` → Run |
| 2. Login + link | `npx supabase login` then `npx supabase link --project-ref YOUR_PROJECT_REF` |
| 3. Set Semaphore key (secret) | `npx supabase secrets set SEMAPHORE_API_KEY=your_actual_key` — **not** `deploy`; this only sets the secret. |
| 4. Deploy the function | `npx supabase functions deploy send-expiry-reminders` — deploy the **function name**, not the secret name. |
| 5. Get anon key | Dashboard → Project Settings → API → anon public |
| 6. Test (no params) | `curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders" -H "Authorization: Bearer YOUR_ANON_KEY"` |
| 7. Test with today override | Add `?today=2025-03-12` (use an expiry date you have in a policy) to the URL |
| 8. Force resend | Add `?force=true` to send again even if already sent |

See **Testing** below for what to check in the response.

## 3. Schedule daily (cron)

**Why reminders don’t run automatically:** The Edge Function only runs when something calls its URL. Deploying or testing with curl runs it once; it does **not** run on a schedule until you add a cron job that calls the URL every day.

Run the function **once per day** so reminders go out automatically (e.g. 30 days before expiry, or on expiry day if `DAYS_BEFORE_EXPIRY=0`).

### Option A: External cron (e.g. cron-job.org) — recommended

1. Go to [cron-job.org](https://cron-job.org) (free; sign up if needed).
2. Create a new job:
   - **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders`
   - **Method:** POST
   - **Headers:** Add header **Authorization** = `Bearer YOUR_ANON_KEY` (get anon key from Supabase Dashboard → Project Settings → API → anon public).
   - **Schedule:** Daily at a fixed time (e.g. 8:00 AM).
3. Save. The job will call your function every day so new expiring policies get SMS and email without you doing anything.

### Option B: Supabase pg_cron (if enabled)

In **Supabase → Database → Extensions**, enable `pg_cron` and `pg_net`. Then in SQL Editor run (replace the URL and anon key):

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

## 4. Gmail API (optional)

The function already supports sending email via **Gmail API**. To send from your Gmail account, set four secrets after a one-time Google Cloud setup. See **docs/GMAIL-SETUP.md** for:

- Enabling Gmail API and creating OAuth client (Client ID + Client secret)
- Getting a refresh token (e.g. via OAuth 2.0 Playground)
- Setting secrets: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM_EMAIL

If these are set, the function uses Gmail for email when Resend is not configured; no code changes or redeploy needed.

## 5. Testing

### Deploy first

From the project root:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy send-expiry-reminders
```

Get **YOUR_ANON_KEY** from Dashboard → Project Settings → API → **anon** public.

### Manual trigger

**Basic (use server’s “today”):**
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Force a specific date (e.g. to match a policy’s expiry):**
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders?today=2025-03-12" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
Use the same date as one of your policy **Expiry Date** values (e.g. from the app’s Data management or from the response `debug.allExpiryDates`).

**Resend even if already sent (for repeated tests):**
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expiry-reminders?today=2025-03-12&force=true" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### What to check in the response

- **`debug.serverTodayUTC`** – Date the function considers “today”. For testing, call with `?today=YYYY-MM-DD` set to a policy’s expiry.
- **`debug.expiringCount`** – Number of policies that matched (expiry in the next N days, or today if `DAYS_BEFORE_EXPIRY=0`). If 0, use `?today=` with an expiry date you have.
- **`debug.allExpiryDates`** – List of policies with `expiry` and `normalized` date; use one of these for `?today=`.
- **`debug.clientNames`** – Client full names; policy’s Full Name / Insured Name must match one of these.
- **`debug.emailProvider`** – `"resend"` | `"gmail"` | `"none"`. If you expect Gmail but see `"resend"`, remove or unset `RESEND_API_KEY` so Gmail is used.
- **`debug.tip`** – Suggests `?today=` or `?force=true` when needed.
- **`results[]`** – For each expiring policy:
  - **`matchedClient`** – `true` if a client was found (required for SMS/email).
  - **`phoneLast4`** – Last 4 digits of the number used for SMS (null if no valid contact).
  - **`sms`** – `"sent"` | `"no_phone"` | `"already_sent"` | or error text.
  - **`smsError`** – Present when SMS failed (e.g. invalid API key, insufficient balance).
  - **`email`** – `"sent"` | `"no_email"` | `"already_sent"` | `"no_email_key"` | or error (e.g. `gmail_token_failed: ...`).

Also check **Supabase → Edge Function logs** for `send-expiry-reminders` and **Table Editor → expiry_reminders_sent** to see what was recorded.

### Troubleshooting: SMS or email not sending

1. **Use `?force=true`** – After the first run, reminders are marked sent. Without `force=true`, the function will not send again. Example: `?today=2025-03-12&force=true`.
2. **Use `?today=YYYY-MM-DD`** – The function only considers policies whose **Expiry Date** equals “today”. If the server date doesn’t match your test policy, pass a date that matches (see `debug.allExpiryDates`). Example: `?today=2025-03-12`.
3. **`expiringCount` is 0** – No policy has that expiry date. The function uses the **latest submission only** (most recent save). After adding a new policy in the app, you must **Save/Submit** so it appears in the latest submission. Pick a date from `debug.allExpiryDates` for `?today=` to test.
4. **`matchedClient: false`** – Policy’s Full Name or Insured Name doesn’t match any Client **Full Name** (exact match after trimming and lowercasing). Fix the name in Client Info or Policy Info so they match.
5. **`sms: "no_phone"`** – Client has no **Contact No** (col_8) or it’s invalid. Use a 10-digit PH number or 63xxxxxxxxx.
6. **`email: "no_email"`** – Client has no **Email** (col_7) or it doesn’t contain `@`.
7. **Gmail not used** – If `debug.emailProvider` is `"resend"`, the function uses Resend, not Gmail. Unset `RESEND_API_KEY` (and optionally `RESEND_FROM`) in Edge Function secrets so Gmail is used.
8. **`email: "gmail_token_failed: ..."`** – Refresh token invalid or expired. Create a new refresh token in OAuth Playground and set `GMAIL_REFRESH_TOKEN` again.

## 6. Data used

- **Policy expiry:** Policy Info → **Expiry Date** (col_8).
- **Client match:** Policy’s Full Name (col_1) / Insured Name (col_2) matched to Client Info → Full Name (col_1).
- **SMS:** Client Info → **Contact No** (col_8), normalized to Philippine format (e.g. 63xxxxxxxxx).
- **Email:** Client Info → **Email** (col_7). If missing or invalid, only SMS is sent (if phone exists).
