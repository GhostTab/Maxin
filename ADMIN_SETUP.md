# Admin-only access setup

The app and database are locked down so **only admin users** can see or change data. Everyone else gets "Admin access only" and is signed out.

**Note:** Supabase does **not** show a "role" or "admin" label in the Users list. The admin role is stored in **App Metadata** (internal to the user record) and is only used in the JWT when they log in. Use the SQL method below to set it, then verify with the check query.

## 1. Apply the secure schema (if you haven’t)

In **Supabase → SQL Editor**, run the full **`supabase-schema.sql`** script.  
It sets RLS so only users with `app_metadata.role = 'admin'` can access `submissions` and storage.

## 2. Make a user an admin (SQL — use this)

Supabase’s dashboard often doesn’t show an "App Metadata" or "role" field for users, so the reliable way is **SQL Editor**:

1. Go to **Supabase → SQL Editor → New query**.
2. Replace the email with **your** admin user’s email, then run:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
WHERE email = 'your-admin@example.com';
```

3. That user should **log out of the app and log in again** so the new JWT includes `role: admin`.

### Verify the role is set

In **SQL Editor**, run (use the same email):

```sql
SELECT id, email, raw_app_meta_data
FROM auth.users
WHERE email = 'your-admin@example.com';
```

You should see `raw_app_meta_data` containing `{"role": "admin"}` (and possibly other keys). There is no separate "Admin" label in the Authentication → Users table; this column is the only place it shows in the dashboard (via this query).

## 3. (Optional) Seed test data for the Dashboard

In **Supabase → SQL Editor**, run the full **`supabase-seed.sql`** script. It inserts sample clients and policies (with empty file upload fields) and sets that submission as current. Use this to test the Dashboard charts and Data Management without entering data manually.

## 4. Add more admins later

Run the same `UPDATE auth.users ... WHERE email = '...'` for each new admin email. Only users whose `raw_app_meta_data` includes `"role":"admin"` can access data.

## Summary

| Who              | Can access data? |
|------------------|-------------------|
| Not logged in    | No (redirect to login) |
| Logged in, no role / role ≠ admin | No (signed out, "Admin access only") |
| Logged in, `app_metadata.role = 'admin'` | Yes (full access) |

Data in `submissions`, `current_clients`, `current_policies`, and the uploads bucket is only available to admin users.

---

## Storage and large files

- **Where files live:** KYC and policy documents are stored in Supabase Storage (bucket `uploads`). The database only stores the file **URL**, so it stays small and can handle many records.
- **Large file limits:** In **Supabase → Storage → Configuration**, you can increase the **File size limit** for the `uploads` bucket (e.g. 100 MB or more) so users can upload large PDFs. Standard uploads support up to 5 GB per file.
- **Downloading files:** In **Data Management**, open a client or policy and use **Download file** next to any uploaded document to save the actual file (PDF, etc.) with a clear name. The Excel export still contains links to those files; use the in-app download for the file itself.
