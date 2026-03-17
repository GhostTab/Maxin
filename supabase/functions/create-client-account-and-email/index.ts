// Admin-only: create auth user with auto-generated password and email credentials to the client.
// Called after Add Client save. POST body: { email: string, clientName?: string }.
// Uses RESEND_API_KEY + RESEND_FROM or Gmail; optional APP_LOGIN_URL for the link in the email.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const RESEND_URL = "https://api.resend.com/emails"
const GMAIL_OAUTH2_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GMAIL_API_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

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

/** Generate a strong random password: 16 chars, alphanumeric + safe symbols. */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*"
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join("")
}

async function sendEmailResend(
  apikey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apikey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: (data as { message?: string }).message || res.statusText }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function getGmailAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(GMAIL_OAUTH2_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: (data as { error_description?: string }).error_description || res.statusText }
    const accessToken = (data as { access_token?: string }).access_token
    if (!accessToken) return { ok: false, error: "No access_token" }
    return { ok: true, accessToken }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function sendEmailGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const mime = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      html,
    ].join("\r\n")
    const encoder = new TextEncoder()
    const bytes = encoder.encode(mime)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    const res = await fetch(GMAIL_API_SEND_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: base64url }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: (data as { error?: { message?: string } }).error?.message || res.statusText }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
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

    let body: { email?: string; clientName?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400)
    }
    const email = typeof body.email === "string" ? body.email.trim() : ""
    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "Valid email is required" }, 400)
    }

    const clientName = typeof body.clientName === "string" ? body.clientName.trim() : ""
    const password = generatePassword()

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {},
      app_metadata: { role: "user" },
    })

    if (createError) {
      return jsonResponse({ error: createError.message || "Failed to create user" }, 400)
    }

    const appLoginUrl = (Deno.env.get("APP_LOGIN_URL") || "").trim()
    const loginLink = appLoginUrl ? `<a href="${appLoginUrl}">${appLoginUrl}</a>` : "your MAXIN portal"
    const greeting = clientName ? `Hello ${clientName},` : "Hello,"
    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; line-height: 1.5;">
  <p>${greeting}</p>
  <p>An account has been created for you to view your records on MAXIN.</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Password:</strong> ${password}</p>
  <p>Sign in at ${loginLink} to view your records. We recommend changing your password after first login.</p>
  <p>— MAXIN Insurance</p>
</body>
</html>`

    const resendKey = Deno.env.get("RESEND_API_KEY")
    const resendFrom = Deno.env.get("RESEND_FROM") || "MAXIN Insurance <onboarding@resend.dev>"
    const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID")
    const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET")
    const gmailRefreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN")
    const gmailFromEmail = (Deno.env.get("GMAIL_FROM_EMAIL") || "").trim()
    const hasResend = !!resendKey
    const hasGmail = !!(gmailClientId && gmailClientSecret && gmailRefreshToken && gmailFromEmail.includes("@"))

    if (hasResend) {
      const result = await sendEmailResend(resendKey!, resendFrom, email, "Your MAXIN account to view your records", html)
      if (!result.ok) {
        return jsonResponse({ error: `Account created but email failed: ${result.error}` }, 500)
      }
    } else if (hasGmail && gmailClientId && gmailClientSecret && gmailRefreshToken) {
      const tokenResult = await getGmailAccessToken(gmailClientId, gmailClientSecret, gmailRefreshToken)
      if (!tokenResult.ok) {
        return jsonResponse({ error: `Account created but email failed: ${tokenResult.error}` }, 500)
      }
      const fromDisplay = gmailFromEmail.includes("<") ? gmailFromEmail : `MAXIN Insurance <${gmailFromEmail}>`
      const result = await sendEmailGmail(tokenResult.accessToken, fromDisplay, email, "Your MAXIN account to view your records", html)
      if (!result.ok) {
        return jsonResponse({ error: `Account created but email failed: ${result.error}` }, 500)
      }
    } else {
      return jsonResponse({ error: "Account created but no email provider configured (set RESEND_API_KEY or Gmail secrets)" }, 500)
    }

    return jsonResponse({ ok: true }, 200)
  } catch (err) {
    return jsonResponse({ error: (err instanceof Error ? err.message : "Function error") }, 500)
  }
})
