/**
 * Single-file mode: one current document, up to 5 previous versions (commit history).
 * Works with or without the is_current column (fallback uses "latest by submitted_at" as current).
 */

import { supabase } from './supabase'

export const MAX_HISTORY = 5

let useIsCurrentColumn = null
let useMessageColumn = null

function columnError(err) {
  if (!err) return false
  const code = String(err.code || '')
  const msg = String(err.message || '').toLowerCase()
  const details = String((err.details || err.error_description || '')).toLowerCase()
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    err.status === 400 ||
    msg.includes('is_current') ||
    msg.includes('message') ||
    msg.includes('column') ||
    details.includes('is_current') ||
    details.includes('message')
  )
}

async function insertOne(supabaseClient, payload) {
  const { data, error } = await supabaseClient
    .from('submissions')
    .insert(payload)
    .select('id')
    .single()
  if (error && columnError(error) && 'message' in payload && useMessageColumn !== false) {
    useMessageColumn = false
    const { message: _m, ...rest } = payload
    return insertOne(supabaseClient, rest)
  }
  if (error) throw error
  return data
}

function selectFields() {
  return useMessageColumn !== false ? 'id, submitted_at, data, message' : 'id, submitted_at, data'
}

async function getCurrentWithSelect(supabaseClient, fields) {
  if (useIsCurrentColumn !== false) {
    const { data, error } = await supabaseClient
      .from('submissions')
      .select(fields)
      .eq('is_current', true)
      .maybeSingle()
    if (!error) {
      useIsCurrentColumn = true
      return data
    }
    if (columnError(error)) useIsCurrentColumn = false
    else throw error
  }
  const { data, error } = await supabaseClient
    .from('submissions')
    .select(fields)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

const TABLE_SETUP_MSG =
  'Submissions table not found or not accessible. Run supabase-schema.sql in your Supabase project (Dashboard → SQL Editor) and ensure you are logged in.'

const MINIMAL_FIELDS = 'id, submitted_at, data'

/** Try minimal select (no is_current, no message) to avoid 400 when those columns are missing. */
async function getCurrentMinimal(supabaseClient) {
  const { data, error } = await supabaseClient
    .from('submissions')
    .select(MINIMAL_FIELDS)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getCurrentSubmission() {
  if (useIsCurrentColumn === null && useMessageColumn === null) {
    try {
      const data = await getCurrentMinimal(supabase)
      useIsCurrentColumn = false
      return data
    } catch (e) {
      if (columnError(e)) throw new Error(TABLE_SETUP_MSG)
      throw e
    }
  }
  let fields = selectFields()
  try {
    return await getCurrentWithSelect(supabase, fields)
  } catch (e) {
    if (columnError(e) && useMessageColumn !== false) {
      useMessageColumn = false
      try {
        return await getCurrentWithSelect(supabase, MINIMAL_FIELDS)
      } catch (e2) {
        throw new Error(TABLE_SETUP_MSG)
      }
    }
    if (columnError(e)) throw new Error(TABLE_SETUP_MSG)
    throw e
  }
}

/** Save as the new current; keep only 5 history (oldest deleted when a new save is made). */
export async function saveCurrent(supabaseClient, payload, commitMessage = null) {
  const basePayload = {
    submitted_at: new Date().toISOString(),
    status: 'submitted',
    data: payload,
  }
  if (useMessageColumn !== false) {
    basePayload.message = commitMessage && String(commitMessage).trim() ? String(commitMessage).trim() : null
  }
  const insertPayload = { ...basePayload }
  if (useIsCurrentColumn === true) {
    insertPayload.is_current = true
  }

  if (useIsCurrentColumn === true) {
    const { data: existing } = await supabaseClient
      .from('submissions')
      .select('id')
      .eq('is_current', true)
      .maybeSingle()

    if (existing?.id) {
      await supabaseClient.from('submissions').update({ is_current: false }).eq('id', existing.id)
    }

    const inserted = await insertOne(supabaseClient, insertPayload)

    const { data: historyRows } = await supabaseClient
      .from('submissions')
      .select('id')
      .eq('is_current', false)
      .order('submitted_at', { ascending: true })
    const toDelete = (historyRows || []).slice(0, Math.max(0, historyRows.length - MAX_HISTORY))
    for (const row of toDelete) {
      await supabaseClient.from('submissions').delete().eq('id', row.id)
    }
    return inserted
  }

  const inserted = await insertOne(supabaseClient, insertPayload)

  const { data: allRows } = await supabaseClient
    .from('submissions')
    .select('id')
    .order('submitted_at', { ascending: true })
  const toDelete = (allRows || []).slice(0, Math.max(0, allRows.length - (MAX_HISTORY + 1)))
  for (const row of toDelete) {
    await supabaseClient.from('submissions').delete().eq('id', row.id)
  }
  return inserted
}
