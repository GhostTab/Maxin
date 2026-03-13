// Supabase Edge Function: send SMS (Semaphore) and email (Resend or Gmail API) to clients 30 days before (or on) policy expiry.
// Schedule daily via cron. Query params: ?today=YYYY-MM-DD to override "today"; ?force=true to resend.
// Secrets: SEMAPHORE_API_KEY (required). For email use either RESEND_API_KEY + RESEND_FROM, OR Gmail: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM_EMAIL (your Gmail address).

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// npm: specifier is resolved by Deno at deploy time; ignore in workspace TS
// @ts-expect-error Deno npm specifier
import { createClient } from "npm:@supabase/supabase-js@2"

// Declare Deno for editors that don't load Edge Runtime types (runtime is Deno)
declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

// Send two reminder types: (1) 30 days before expiry, (2) on the expiry date (today).
const REMINDER_30_DAYS_BEFORE = 30
const REMINDER_EXPIRY_DAY = 0
const SEMAPHORE_URL = "https://api.semaphore.co/api/v4/messages"
const RESEND_URL = "https://api.resend.com/emails"
const GMAIL_OAUTH2_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GMAIL_API_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

interface PolicyRow {
  col_1?: string
  col_2?: string
  col_3?: string
  col_4?: string
  col_5?: string
  col_8?: string
}

interface ClientRow {
  col_1?: string
  col_7?: string
  col_8?: string
}

function parseDate(s: string | undefined): Date | null {
  if (!s || typeof s !== "string") return null
  const d = new Date(s.trim())
  return isNaN(d.getTime()) ? null : d
}

/** Normalize any date string to YYYY-MM-DD for comparison. If already YYYY-MM-DD, use as-is (date-only, no timezone shift). */
function toYYYYMMDD(s: string | undefined): string | null {
  if (!s || typeof s !== "string") return null
  const trimmed = s.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const d = parseDate(trimmed)
  return d ? d.toISOString().slice(0, 10) : null
}

/** Server "today" in UTC as YYYY-MM-DD. Can be overridden via ?today=YYYY-MM-DD for testing. */
function getTodayUTC(url: URL): string {
  const override = url.searchParams.get("today")
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override.trim())) return override.trim()
  return new Date().toISOString().slice(0, 10)
}

/** Normalize name for matching: trim, collapse spaces, lower case. */
function normName(s: string | undefined): string {
  if (!s || typeof s !== "string") return ""
  return s.trim().replace(/\s+/g, " ").toLowerCase()
}

/** Days from today to expiry (0 = today, 30 = 30 days from now). Returns null if invalid. */
function getDiffDays(expiryStr: string | undefined, todayStr: string): number | null {
  const expiryNorm = toYYYYMMDD(expiryStr)
  if (!expiryNorm) return null
  const todayMs = new Date(todayStr + "Z").getTime()
  const expiryMs = new Date(expiryNorm + "Z").getTime()
  return Math.round((expiryMs - todayMs) / (24 * 60 * 60 * 1000))
}

function isExpiringInDays(expiryStr: string | undefined, days: number, todayStr: string): boolean {
  const diff = getDiffDays(expiryStr, todayStr)
  return diff !== null && diff >= 0 && diff <= days
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone || typeof phone !== "string") return null
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 10) return null
  // Philippine: 639xxxxxxxxx or 09xxxxxxxxx
  if (digits.startsWith("63")) return digits
  if (digits.startsWith("0")) return "63" + digits.slice(1)
  if (digits.length === 10) return "63" + digits
  return digits
}

async function sendSms(apikey: string, number: string, message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = new URLSearchParams({ apikey, number, message })
    const res = await fetch(SEMAPHORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (data as { message?: string }).message || (data as { error?: string }).error || res.statusText
      return { ok: false, error: msg }
    }
    const list = Array.isArray(data) ? data : [data]
    const failedItem = list.find((r: { status?: string }) => String(r?.status).toLowerCase() === "failed")
    if (failedItem) {
      const errMsg = (failedItem as { status?: string; message?: string }).message || "Semaphore reported failed"
      return { ok: false, error: errMsg }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function sendEmail(
  apikey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apikey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: (data as { message?: string }).message || res.statusText }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/** Get Gmail API access token from refresh token. */
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
    if (!res.ok) return { ok: false, error: (data as { error_description?: string }).error_description || (data as { error?: string }).error || res.statusText }
    const accessToken = (data as { access_token?: string }).access_token
    if (!accessToken) return { ok: false, error: "No access_token in response" }
    return { ok: true, accessToken }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/** Send email via Gmail API (OAuth2). From must be the authenticated Gmail address or a valid alias. */
async function sendEmailViaGmail(
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
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64url }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const errMsg = (data as { error?: { message?: string } }).error?.message || res.statusText
      return { ok: false, error: errMsg }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

Deno.serve(async (req) => {
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const semaphoreKey = Deno.env.get("SEMAPHORE_API_KEY")
  const resendKey = Deno.env.get("RESEND_API_KEY")
  const resendFrom = Deno.env.get("RESEND_FROM") || "MAXIN Insurance <onboarding@resend.dev>"
  const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID")
  const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET")
  const gmailRefreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN")
  const gmailFromEmail = (Deno.env.get("GMAIL_FROM_EMAIL") || "").trim()
  const hasResend = !!resendKey
  const gmailFromValid = (gmailFromEmail && gmailFromEmail.includes("@")) ?? false
  const hasGmail = !!(gmailClientId && gmailClientSecret && gmailRefreshToken && gmailFromValid)
  const emailFromDisplay = hasResend ? resendFrom : (hasGmail ? (gmailFromEmail!.includes("<") ? gmailFromEmail! : `MAXIN Insurance <${gmailFromEmail}>`) : "")

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (!semaphoreKey) {
    return new Response(JSON.stringify({ error: "Missing SEMAPHORE_API_KEY. Set it in Edge Function secrets." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  const serverToday = getTodayUTC(url)
  const forceResend = url.searchParams.get("force") === "true" || url.searchParams.get("force") === "1"

  // Get current submission (latest by submitted_at)
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, data")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subErr || !submission?.data) {
    return new Response(
      JSON.stringify({ error: "No submission found", detail: subErr?.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const clientInfo: ClientRow[] = Array.isArray((submission.data as { client_info?: unknown }).client_info)
    ? (submission.data as { client_info: ClientRow[] }).client_info
    : []
  const policyInfo: PolicyRow[] = Array.isArray((submission.data as { policy_info?: unknown }).policy_info)
    ? (submission.data as { policy_info: PolicyRow[] }).policy_info
    : []

  const expiringToday = policyInfo.filter((p) => getDiffDays(p.col_8, serverToday) === REMINDER_EXPIRY_DAY)
  const expiringIn30Days = policyInfo.filter((p) => getDiffDays(p.col_8, serverToday) === REMINDER_30_DAYS_BEFORE)
  const results: { reminderType: "30day" | "today"; policyNo: string; insuredName: string; expiryStored: string; matchedClient: boolean; phoneLast4: string | null; sms: string; smsError?: string; email: string }[] = []

  // Log so cron runs show up in Edge Function logs
  const expiryList = policyInfo.map((p) => ({ no: p.col_3, raw: p.col_8, normalized: toYYYYMMDD(p.col_8) }))
  console.log(
    `[send-expiry-reminders] submission_id=${submission.id} serverToday=${serverToday} totalPolicies=${policyInfo.length} expiringToday=${expiringToday.length} expiringIn30Days=${expiringIn30Days.length} forceResend=${forceResend} allExpiries=${JSON.stringify(expiryList)}`
  )

  const processPolicies = async (
    policies: PolicyRow[],
    reminderType: "30day" | "today"
  ) => {
    const isToday = reminderType === "today"
    const smsKey = isToday ? "sms_sent_at" : "sms_30day_sent_at"
    const emailKey = isToday ? "email_sent_at" : "email_30day_sent_at"

    for (const policy of policies) {
      const policyNo = (policy.col_3 || "").trim() || "N/A"
      const insuredName = (policy.col_2 || policy.col_1 || "").trim() || "Valued Client"
      const expiryDate = (policy.col_8 || "").trim()
      const provider = (policy.col_4 || "").trim()
      const line = (policy.col_5 || "").trim()
      const policyIdentifier = `${policyNo}-${expiryDate}`

      const { data: existing } = await supabase
        .from("expiry_reminders_sent")
        .select("id, sms_sent_at, email_sent_at, sms_30day_sent_at, email_30day_sent_at")
        .eq("submission_id", submission.id)
        .eq("policy_identifier", policyIdentifier)
        .maybeSingle()

      const existingSms = existing?.[smsKey as keyof typeof existing] as string | null | undefined
      const existingEmail = existing?.[emailKey as keyof typeof existing] as string | null | undefined
      let smsSentAt: string | null = forceResend ? null : (existingSms ?? null)
      let emailSentAt: string | null = forceResend ? null : (existingEmail ?? null)

      const policyName1 = normName(policy.col_1)
      const policyName2 = normName(policy.col_2)
      const client = clientInfo.find((c) => {
        const c1 = normName(c.col_1)
        if (!c1) return false
        return c1 === policyName1 || c1 === policyName2
      })
      const phone = normalizePhone(client?.col_8)
      const phoneLast4 = phone ? phone.slice(-4) : null
      const clientEmail = (client?.col_7 || "").trim() && (client?.col_7 || "").includes("@") ? (client?.col_7 || "").trim() : null

      const smsMessage = isToday
        ? `MAXIN Insurance: Your policy ${policyNo}${provider ? ` (${provider})` : ""} expires TODAY (${expiryDate}). Renew to avoid lapse. Contact us for assistance.`
        : `MAXIN Insurance: Your policy ${policyNo}${provider ? ` (${provider})` : ""} expires in 30 days (${expiryDate}). Renew before then to avoid lapse. Contact us for assistance.`
      const expiryLabel = isToday ? "expires today" : "expires in 30 days"
      const emailSubject = `Policy expiration reminder: ${policyNo} ${expiryLabel}`
      const emailHtml = `
      <p>Dear ${insuredName},</p>
      <p>This is a reminder that your insurance policy ${isToday ? "expires <strong>today</strong>." : "will expire in <strong>30 days</strong>."}</p>
      <ul>
        <li><strong>Policy No:</strong> ${policyNo}</li>
        <li><strong>Expiry Date:</strong> ${expiryDate}</li>
        ${provider ? `<li><strong>Provider:</strong> ${provider}</li>` : ""}
        ${line ? `<li><strong>Line:</strong> ${line}</li>` : ""}
      </ul>
      <p>Please renew before the expiry date to avoid a lapse in coverage.</p>
      <p>If you have any questions, please contact us.</p>
      <p>— MAXIN Insurance & Investment</p>
    `

      if (phone && !smsSentAt) {
        const smsResult = await sendSms(semaphoreKey, phone, smsMessage)
        if (smsResult.ok) smsSentAt = new Date().toISOString()
        results.push({
          reminderType,
          policyNo,
          insuredName,
          expiryStored: expiryDate,
          matchedClient: !!client,
          phoneLast4,
          sms: smsResult.ok ? "sent" : (smsResult.error || "failed"),
          smsError: smsResult.error,
          email: emailSentAt ? "already_sent" : !clientEmail ? "no_email" : (hasResend || hasGmail) ? "pending" : "no_email_key",
        })
      } else {
        results.push({
          reminderType,
          policyNo,
          insuredName,
          expiryStored: expiryDate,
          matchedClient: !!client,
          phoneLast4,
          sms: smsSentAt ? "already_sent" : !phone ? "no_phone" : "skipped",
          email: emailSentAt ? "already_sent" : !clientEmail ? "no_email" : (hasResend || hasGmail) ? "pending" : "no_email_key",
        })
      }

      if (clientEmail && !emailSentAt) {
        if (hasResend) {
          const emailResult = await sendEmail(resendKey!, resendFrom, clientEmail, emailSubject, emailHtml)
          if (emailResult.ok) emailSentAt = new Date().toISOString()
          const r = results[results.length - 1]
          if (r) r.email = emailResult.ok ? "sent" : (emailResult.error || "failed")
        } else if (hasGmail && gmailClientId && gmailClientSecret && gmailRefreshToken) {
          const tokenResult = await getGmailAccessToken(gmailClientId, gmailClientSecret, gmailRefreshToken)
          if (tokenResult.ok) {
            const emailResult = await sendEmailViaGmail(tokenResult.accessToken, emailFromDisplay, clientEmail, emailSubject, emailHtml)
            if (emailResult.ok) emailSentAt = new Date().toISOString()
            const r = results[results.length - 1]
            if (r) r.email = emailResult.ok ? "sent" : (emailResult.error || "failed")
          } else {
            const r = results[results.length - 1]
            if (r) r.email = "gmail_token_failed: " + (tokenResult.error || "unknown")
          }
        }
      }

      const upsertPayload: Record<string, unknown> = {
        submission_id: submission.id,
        policy_identifier: policyIdentifier,
        expiry_date: expiryDate,
        client_phone: phone || null,
        client_email: clientEmail || null,
        sms_sent_at: isToday ? (smsSentAt ?? existing?.sms_sent_at ?? null) : (existing?.sms_sent_at ?? null),
        email_sent_at: isToday ? (emailSentAt ?? existing?.email_sent_at ?? null) : (existing?.email_sent_at ?? null),
        sms_30day_sent_at: isToday ? (existing?.sms_30day_sent_at ?? null) : (smsSentAt ?? existing?.sms_30day_sent_at ?? null),
        email_30day_sent_at: isToday ? (existing?.email_30day_sent_at ?? null) : (emailSentAt ?? existing?.email_30day_sent_at ?? null),
      }
      await supabase.from("expiry_reminders_sent").upsert(upsertPayload as Record<string, string | null>, {
        onConflict: "submission_id,policy_identifier,expiry_date",
      })
    }
  }

  await processPolicies(expiringIn30Days, "30day")
  await processPolicies(expiringToday, "today")
  const expiringPolicies = expiringIn30Days.length + expiringToday.length

  const tip =
    expiringPolicies === 0
      ? "No policies expire today or in 30 days on serverTodayUTC. Save your form after adding a policy. Use ?today=YYYY-MM-DD to match a policy expiry. Use ?force=true to resend."
      : results.some((r) => r.sms === "already_sent" || r.email === "already_sent")
        ? "Reminders were already sent for some/all. Use ?force=true to resend SMS and email."
        : undefined

  const sentCount = results.filter((r) => r.sms === "sent" || r.email === "sent").length
  const alreadyCount = results.filter((r) => r.sms === "already_sent" || r.email === "already_sent").length
  console.log(
    `[send-expiry-reminders] done: serverToday=${serverToday} expiringToday=${expiringToday.length} expiringIn30Days=${expiringIn30Days.length} | sent=${sentCount} already_sent=${alreadyCount} | results: ${JSON.stringify(results.map((r) => ({ type: r.reminderType, policy: r.policyNo, sms: r.sms, email: r.email })))}`
  )

  return new Response(
    JSON.stringify({
      ok: true,
      debug: {
        serverTodayUTC: serverToday,
        forceResend,
        totalPolicies: policyInfo.length,
        expiringTodayCount: expiringToday.length,
        expiringIn30DaysCount: expiringIn30Days.length,
        tip,
        emailProvider: hasResend ? "resend" : hasGmail ? "gmail" : "none",
        emailSecretsHint: !hasResend && !hasGmail
          ? "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM_EMAIL in Edge Function secrets (Dashboard → Edge Functions → Secrets) to send email via Gmail."
          : undefined,
        gmailSecretsSet: { clientId: !!gmailClientId, clientSecret: !!gmailClientSecret, refreshToken: !!gmailRefreshToken, fromEmail: !!gmailFromValid },
        clientNames: clientInfo.map((c) => c.col_1),
        allExpiryDates: policyInfo.map((p) => ({ policyNo: p.col_3, expiry: p.col_8, normalized: toYYYYMMDD(p.col_8), col_1: p.col_1, col_2: p.col_2 })),
      },
      message: `Processed ${expiringToday.length} expiring today + ${expiringIn30Days.length} expiring in 30 days`,
      results,
      emailConfigured: hasResend || hasGmail,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
})
