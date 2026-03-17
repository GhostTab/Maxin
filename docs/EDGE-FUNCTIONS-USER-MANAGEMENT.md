# Edge Functions for User Management – full code & CORS fix

## Fix CORS preflight (required)

The error **"Response to preflight request doesn't pass access control check: It does not have HTTP ok status"** happens when Supabase blocks the **OPTIONS** request before it reaches your function.

**The dashboard has no "Verify JWT" or "Settings" menu** for Edge Functions. You must deploy with JWT verification **off** using the **Supabase CLI**:

1. Open a terminal in the project root (`c:\Users\Windows 11\Documents\Maxin`).
2. Log in and link (if not already):  
   `npx supabase login`  
   `npx supabase link --project-ref coeevzawqqpzgqhofvsm`
3. Deploy both functions (this project’s `supabase/config.toml` already sets `verify_jwt = false` for them):  
   `npx supabase functions deploy admin-create-user`  
   `npx supabase functions deploy admin-list-users`

Your function code still checks the JWT and returns 401/403 for non-admins; turning off verify_jwt only lets the OPTIONS preflight through.

---

## 1. admin-create-user (full code)

Replace the entire function body in the dashboard with:

```ts
// Admin-only: create a new user (email + password). No self-registration; admin gives credentials to clients.
// Call with: POST body { "email": "...", "password": "..." }, Authorization: Bearer <session JWT>.
// Requires: caller's app_metadata.role === 'admin'. Uses SUPABASE_SERVICE_ROLE_KEY to create user.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim()
  if (!token) {
    return jsonResponse({ error: "Missing Authorization header" }, 401)
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error: claimsError } = await client.auth.getClaims(token)
  if (claimsError || !data?.claims) {
    return jsonResponse({ error: "Invalid or expired token" }, 401)
  }
  const claims = data.claims as { app_metadata?: { role?: string }; role?: string }
  const role = (claims?.app_metadata?.role ?? claims?.role) ?? ""
  if (role !== "admin") {
    return jsonResponse({ error: "Admin only" }, 403)
  }

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400)
  }
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!email || !password) {
    return jsonResponse({ error: "email and password are required" }, 400)
  }
  if (password.length < 6) {
    return jsonResponse({ error: "Password must be at least 6 characters" }, 400)
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {},
    app_metadata: { role: "user" },
  })

  if (createError) {
    const msg = createError.message || "Failed to create user"
    return jsonResponse({ error: msg }, 400)
  }
  return jsonResponse(
    { id: newUser.user?.id, email: newUser.user?.email },
    201
  )
})
```

---

## 2. admin-list-users (full code)

Replace the entire function body in the dashboard with:

```ts
// Admin-only: list auth users (id, email, created_at, role).
// Call with: GET (?per_page=50&page=1) or POST body { page?, per_page? }, Authorization: Bearer <session JWT>.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim()
  if (!token) {
    return jsonResponse({ error: "Missing Authorization header" }, 401)
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error: claimsError } = await client.auth.getClaims(token)
  if (claimsError || !data?.claims) {
    return jsonResponse({ error: "Invalid or expired token" }, 401)
  }
  const claims = data.claims as { app_metadata?: { role?: string }; role?: string }
  const role = (claims?.app_metadata?.role ?? claims?.role) ?? ""
  if (role !== "admin") {
    return jsonResponse({ error: "Admin only" }, 403)
  }

  let page = 1
  let perPage = 50
  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}))
      page = Math.max(1, parseInt(String(body?.page ?? 1), 10))
      perPage = Math.min(100, Math.max(1, parseInt(String(body?.per_page ?? 50), 10)))
    } catch {
      // keep defaults
    }
  } else {
    const url = new URL(req.url)
    page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
    perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "50", 10)))
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }
  const users = (data.users || []).map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    role: (u.app_metadata?.role as string) || "user",
  }))
  return jsonResponse({ users, total: data.total }, 200)
})
```

---

## Do you need a users table?

**No.** These functions use **Supabase Auth** only. Users live in Supabase’s built-in **auth.users** (and related Auth tables). There is no custom `users` table in your database. The Edge Functions call `auth.admin.createUser()` and `auth.admin.listUsers()`; the app only needs Auth and RLS as described in **USER-MANAGEMENT.md**.
