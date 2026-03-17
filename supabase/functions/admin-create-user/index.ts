// Admin-only: create a new user (email + password). No self-registration; admin gives credentials to clients.
// Call with: POST body { "email": "...", "password": "..." }, Authorization: Bearer <session JWT>.
// Requires: caller's app_metadata.role === 'admin'. Uses SUPABASE_SERVICE_ROLE_KEY to create user.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

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
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: CORS_HEADERS })
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405)
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server configuration error" }, 500)
    }

    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim()
    if (!token) {
      return jsonResponse({ error: "Missing Authorization header" }, 401)
    }

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: userError } = await client.auth.getUser(token)
    if (userError || !user) {
      return jsonResponse({ error: "Invalid or expired token" }, 401)
    }
    const role = (user.app_metadata?.role as string) ?? ""
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
  } catch (err) {
    return jsonResponse({ error: (err instanceof Error ? err.message : "Function error") }, 500)
  }
})
