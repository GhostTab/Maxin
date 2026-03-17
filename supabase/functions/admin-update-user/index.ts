// Admin-only: update user ban state (deactivate/reactivate). No delete.
// POST body: { userId: string, ban_duration: '876000h' | 'none' }.

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

    let body: { userId?: string; ban_duration?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400)
    }
    const userId = typeof body.userId === "string" ? body.userId.trim() : ""
    const banDuration = typeof body.ban_duration === "string" ? body.ban_duration.trim() : ""
    if (!userId) {
      return jsonResponse({ error: "userId is required" }, 400)
    }
    if (banDuration !== "876000h" && banDuration !== "none") {
      return jsonResponse({ error: "ban_duration must be '876000h' (deactivate) or 'none' (reactivate)" }, 400)
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: banDuration,
    })

    if (updateError) {
      return jsonResponse({ error: updateError.message || "Failed to update user" }, 400)
    }
    return jsonResponse({ ok: true }, 200)
  } catch (err) {
    return jsonResponse({ error: (err instanceof Error ? err.message : "Function error") }, 500)
  }
})
