// Admin-only: list auth users (id, email, created_at, role).
// Call with: GET (?per_page=50&page=1) or POST body { page?, per_page? }, Authorization: Bearer <session JWT>.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

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
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: CORS_HEADERS })
    }
    if (req.method !== "GET" && req.method !== "POST") {
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
      banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
      ban_duration: (u as { ban_duration?: string | null }).ban_duration ?? null,
    }))
    return jsonResponse({ users, total: data.total }, 200)
  } catch (err) {
    return jsonResponse({ error: (err instanceof Error ? err.message : "Function error") }, 500)
  }
})
