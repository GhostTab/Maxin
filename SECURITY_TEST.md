# Security test: “Can a hacker get the data?”

Below is what an attacker would try and why it **does not** work with your current setup.

---

## 1. Steal the “API key” from the app and read the database

**Attack:** The frontend uses `VITE_SUPABASE_ANON_KEY`. Anyone can see it in the browser (DevTools → Network, or bundled JS). They could call the Supabase API directly.

**Why it fails:**  
That key is the **anon** key. Every request that uses it is either:

- **Not logged in** → Supabase treats the request as role `anon`. Your RLS policy on `submissions` is `TO authenticated` only. So `anon` gets **no rows** (policy does not grant any access).
- **Logged in as a normal user** → JWT has `role: authenticated` but `app_metadata.role` is not `'admin'`. Your policy requires `(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`. So they still get **no rows**.
- **Logged in as admin** → Only then do they get data; that’s a legitimate admin, not “a hacker.”

So with only the anon key, a hacker **cannot** read your data. The database (RLS) enforces “admin only.”

---

## 2. Forge a JWT with `role: admin`

**Attack:** Build a JWT that has `app_metadata.role = 'admin'` and send it to Supabase.

**Why it fails:**  
JWTs are **signed** by Supabase with the project’s **JWT secret** (only in Supabase Dashboard / server, never in the frontend). Without that secret, a forged token fails signature verification and Supabase rejects it. So a hacker **cannot** create a valid “admin” JWT.

---

## 3. Bypass the app and call the API without logging in

**Attack:** Use the anon key and do `GET /rest/v1/submissions` (or use the JS client without signing in).

**Why it fails:**  
Same as (1): unauthenticated requests are `anon`. Your RLS allows only `authenticated` with `app_metadata.role = 'admin'`. So the response is **empty** (or “permission denied” depending on Supabase version). No data is returned.

---

## 4. Create a normal user and log in

**Attack:** Sign up (if allowed) or use an existing non-admin user and log in, then try to read data.

**Why it fails:**  
- **In the app:** Protected route checks `session?.user?.app_metadata?.role !== 'admin'` and immediately signs them out and redirects to login with “Admin access only.”
- **Direct API:** If they call the API with that user’s JWT, RLS still requires `app_metadata.role = 'admin'`. So they get **no rows**.

So even with a valid account, a non-admin **cannot** see data.

---

## 5. Use the “service role” key to bypass RLS

**Attack:** Supabase’s **service_role** key bypasses RLS. If that key is in the frontend or in a repo, a hacker could use it and read everything.

**Your setup:**  
The app only uses `VITE_SUPABASE_ANON_KEY` (anon key). The **service_role** key is not in the frontend or in the code we saw. As long as you **never** put the service_role key in the client or in public repos, this attack is **not** possible.

**Best practice:** Keep the service_role key only in Supabase Dashboard, or in a secure backend server, never in the browser or in `.env` committed to git.

---

## 6. Sniff or steal an admin’s session

**Attack:** Steal the admin’s JWT (e.g. XSS, network sniffing on non-HTTPS, or stolen device).

**Mitigation:**  
- App runs over **HTTPS** in production (so traffic is encrypted).  
- You can add **2FA** in Supabase (Dashboard → Authentication → Providers) to make stolen passwords less useful.  
- Restrict admin accounts to as few people as possible.

This is the only realistic way to “be the admin” without knowing the secret key; it’s about protecting the admin account, not the RLS design.

---

## How you can test it yourself

You can confirm that non-admins get no data:

1. **Test 1 – Not logged in**  
   Open your app in an **incognito/private** window. Open DevTools → Console. Run:
   ```javascript
   const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
   const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY');
   const { data, error } = await supabase.from('submissions').select('*');
   console.log('Rows:', data?.length, 'Error:', error);
   ```
   Use your real project URL and anon key (from `.env`). You should see **0 rows** (and no error), or an error indicating no permission. You must **not** see your real data.

2. **Test 2 – Logged in as non-admin**  
   Create a **second** user in Supabase (Authentication → Users) and **do not** set `role: admin` for them. Log in to your app with that user. You should be immediately signed out and see “Admin access only.” If you try the same console snippet while that user is logged in (before redirect), you should still get **no rows** from `submissions` because RLS blocks non-admin.

3. **Test 3 – Logged in as admin**  
   Log in with a user that has `raw_app_meta_data` containing `{"role":"admin"}`. You should see data. That confirms the only way to get data is to be a real admin.

---

## Summary

| Attack | Result |
|--------|--------|
| Use anon key only (no login) | No data – RLS allows only `authenticated` + `role = admin`. |
| Forge “admin” JWT | Fails – JWT is signed; secret is not in the client. |
| Call API without login | No data – same as first row. |
| Log in as normal user | App signs out; API still returns no data. |
| Use service_role key | Not possible if key is never in frontend/repo. |
| Steal admin session | Only real risk; mitigate with HTTPS, 2FA, few admins. |

So: **a hacker cannot get your data** with the anon key, forged JWTs, or by creating a normal account. The data is only available to authenticated users whose JWT has `app_metadata.role = 'admin'`, and that can only be set by you (Dashboard or SQL), not by the client.
