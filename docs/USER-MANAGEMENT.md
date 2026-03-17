# User management (admin-created accounts)

Clients cannot register themselves. Only an **admin** can create user accounts and share the login credentials (email + password) with clients. Clients then sign in and see only their own records (matched by the **Email** field in Client Information).

## 1. Set the first admin

In **Supabase Dashboard** → **Authentication** → **Users**, select the user who should be the admin (or create one with email/password first). Then:

- Open that user → **Edit** (or use the three-dot menu).
- Under **User Metadata** or **Raw User Meta Data**, set **app_metadata** to:
  ```json
  { "role": "admin" }
  ```
- Save. That user can now access User management and create client accounts.

## 2. Deploy Edge Functions (admin-only APIs)

The app uses two Edge Functions that must be deployed to your Supabase project:

- **admin-create-user** – creates a new user (email + password) with `email_confirm: true` and `app_metadata: { role: "user" }`.
- **admin-list-users** – returns a list of users (admin-only).

**Important – CORS / preflight:** The dashboard has **no** "Verify JWT" or "Settings" menu for Edge Functions. To fix "Response to preflight request doesn't pass access control check", you must **deploy the functions with JWT verification turned off** so OPTIONS requests reach your code. The function code still checks the JWT and returns 401/403 for non-admins.

**Option A – Deploy with CLI (recommended):** This project has `supabase/config.toml` with `verify_jwt = false` for both functions. From the project root, run:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy admin-create-user
npx supabase functions deploy admin-list-users
```

(Replace `YOUR_PROJECT_REF` with your project ref, e.g. `coeevzawqqpzgqhofvsm` from your Supabase URL.) After the first deploy, config is applied and OPTIONS will reach your function.

**Option B – Deploy without config file:** If you don’t use `config.toml`, deploy with the flag each time:

```bash
npx supabase functions deploy admin-create-user --no-verify-jwt
npx supabase functions deploy admin-list-users --no-verify-jwt
```

**If you only use the dashboard editor:** Paste and deploy the code there, then **re-deploy the same functions once via CLI** (Option A or B above) so `verify_jwt = false` is applied. The dashboard does not expose this setting.

Supabase automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions in production.

## 3. RLS: let clients read submissions

Admins need full access; clients need **read-only** access to the current submission so the app can filter and show only their records. Run the RLS script in **Supabase** → **SQL Editor**:

- Open and run **supabase-rls-admin-and-client-read.sql**.

This keeps admin-only write access and adds a policy so any authenticated user can **SELECT** from `submissions` (clients never write; the app filters data by client email).

## 4. How client data is filtered

- **Client_Info**: a client sees only rows where **Email** (col_7) equals their login email.
- **Policy_Info**: a client sees only policies whose **Insured Name** (col_2) matches one of their client **Full Name** (col_1) from the filtered client rows.

Ensure the admin enters the **same email** in the Client Information sheet as the one used for the client’s login account so that filtering works.

## 5. Summary

| Role   | Can do |
|--------|--------|
| Admin  | Create users, add/edit/delete clients and policies, view all data, User management, Data management. |
| Client | Sign in with provided credentials; view **Dashboard** and **My records** (Spreadsheet) filtered to their own client + policies only. No add/edit/delete, no User management, no Data management. |
