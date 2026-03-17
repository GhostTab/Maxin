# User management (admin and client accounts)

Clients cannot register themselves. **Client accounts are created automatically** when an admin adds a client in **Add Client**: the system creates an auth user with the client’s email and an auto-generated password, then emails the client their login credentials. Admins use **User management** to view users and to **deactivate** or **reactivate** access (no delete, no manual “Create account” form).

## 1. Automated account creation on Add Client

When you save a new client in **Add Client**:

1. The client row is saved to the submission data (Client Information).
2. The Edge Function **create-client-account-and-email** is called with the client’s email and optional name.
3. The function generates a strong password, creates an auth user with `app_metadata.role = "user"`, and sends one transactional email to the client with:
   - Their email and password
   - A sign-in link (if `APP_LOGIN_URL` is set) or a note to sign in at the MAXIN portal

**Email sending** uses the same provider as expiry reminders: **Resend** (`RESEND_API_KEY`, `RESEND_FROM`) or **Gmail** (Gmail OAuth secrets). Optional secret **APP_LOGIN_URL** (e.g. `https://yourapp.com/login`) is used as the link in the “your account” email. Set these in **Supabase Dashboard** → **Edge Functions** → **Secrets**.

If account creation or email fails (e.g. user already exists), the client is still saved; the admin sees a warning and can create an account manually later if needed (e.g. via Supabase Dashboard or a future fallback).

## 2. Set the first admin

In **Supabase Dashboard** → **Authentication** → **Users**, select the user who should be the admin (or create one with email/password first). Then:

- Open that user → **Edit** (or use the three-dot menu).
- Under **User Metadata** or **Raw User Meta Data**, set **app_metadata** to:
  ```json
  { "role": "admin" }
  ```
- Save. That user can now access User management and Add Client (which creates client accounts automatically).

## 3. Deploy Edge Functions (admin-only APIs)

The app uses these Edge Functions (all admin-only; they check JWT and return 401/403 for non-admins):

- **admin-create-user** – (optional fallback) creates a user with email + password; not used by the UI anymore.
- **admin-list-users** – returns the list of users (id, email, role, created_at, banned_until).
- **create-client-account-and-email** – creates an auth user with auto-generated password and sends “Your MAXIN account” email. Uses same email secrets as send-expiry-reminders; optional **APP_LOGIN_URL**.
- **admin-update-user** – updates a user’s ban state (deactivate/reactivate). POST body: `{ userId, ban_duration: '876000h' | 'none' }`.

**Important – CORS / preflight:** So that OPTIONS requests reach your code, deploy with JWT verification off. The function code still checks the JWT.

**Option A – Config file:** This project has `supabase/config.toml` with `verify_jwt = false` for these functions. From the project root:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy admin-create-user
npx supabase functions deploy admin-list-users
npx supabase functions deploy create-client-account-and-email
npx supabase functions deploy admin-update-user
```

**Option B – Deploy with flag:** If you don’t use `config.toml`, deploy with:

```bash
npx supabase functions deploy admin-create-user --no-verify-jwt
npx supabase functions deploy admin-list-users --no-verify-jwt
npx supabase functions deploy create-client-account-and-email --no-verify-jwt
npx supabase functions deploy admin-update-user --no-verify-jwt
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. For **create-client-account-and-email**, also set **RESEND_API_KEY** and **RESEND_FROM** (or Gmail OAuth secrets) and optionally **APP_LOGIN_URL**.

## 4. User Management page (list + deactivate/reactivate only)

- **No “Create client account” form** – accounts are created automatically when adding a client.
- **List users** – table with email, role, status (Active / Deactivated), created date.
- **Deactivate** – blocks a user from signing in (ban). Use for clients who should no longer have access.
- **Reactivate** – restores access for a deactivated user.
- **No Delete user** – deleting users is disabled to keep the link between auth users and client records; use Deactivate to block access.

Deactivate/Reactivate do not apply to the current admin or other admins (only client users can be deactivated).

## 5. RLS: let clients read submissions

Admins have full access; clients have **read-only** access to the current submission so the app can filter by their email. Run the RLS script in **Supabase** → **SQL Editor**:

- Open and run **supabase-rls-admin-and-client-read.sql** (or your project’s equivalent).

## 6. How client data is filtered

- **Client_Info**: a client sees only rows where **Email** (col_7) equals their login email.
- **Policy_Info**: a client sees only policies whose **Insured Name** (col_2) matches one of their client **Full Name** (col_1) from the filtered client rows.

Use the same email in Client Information as the one used for the client’s login so filtering works.

## 7. Summary

| Role   | Can do |
|--------|--------|
| Admin  | Add clients (creates account + email automatically), add/edit/delete policies, view all data, User management (list, deactivate, reactivate), Data management. |
| Client | Sign in with credentials from the “your account” email; view **Dashboard** and **My records** (Spreadsheet) filtered to their own client + policies only. No add/edit/delete, no User management. |
