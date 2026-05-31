/**
 * POST  /api/session  — create or resume a session
 * PATCH /api/session  — update progress, status, completed_at
 */

import { sql } from '../../db/index.js'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
}

const ok  = (data, status = 200) => ({ statusCode: status, headers: HEADERS, body: JSON.stringify(data) })
const err = (msg,  status = 400) => ({ statusCode: status, headers: HEADERS, body: JSON.stringify({ error: msg }) })

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' }

  const body = JSON.parse(event.body || '{}')
  if (!body.session_token) return err('session_token required')

  try {
    if (event.httpMethod === 'POST') {
      const {
        session_token, device_type, browser, os,
        screen_width, screen_height, language, referrer,
        utm_source, utm_medium, utm_campaign
      } = body

      const [row] = await sql`
        INSERT INTO survey_sessions (
          session_token, device_type, browser, os,
          screen_width, screen_height, language, referrer,
          utm_source, utm_medium, utm_campaign
        )
        VALUES (
          ${session_token},  ${device_type ?? null}, ${browser ?? null}, ${os ?? null},
          ${screen_width ?? null}, ${screen_height ?? null}, ${language ?? null},
          ${referrer ?? null}, ${utm_source ?? null}, ${utm_medium ?? null}, ${utm_campaign ?? null}
        )
        ON CONFLICT (session_token) DO UPDATE SET last_active_at = now()
        RETURNING id, session_token, status, started_at
      `
      return ok(row)
    }

    if (event.httpMethod === 'PATCH') {
      const {
        session_token, status, current_chapter, current_question,
        progress_pct, estimated_time_s, completed_at
      } = body

      const [row] = await sql`
        UPDATE survey_sessions SET
          status           = COALESCE(${status          ?? null}, status),
          current_chapter  = COALESCE(${current_chapter ?? null}, current_chapter),
          current_question = COALESCE(${current_question ?? null}, current_question),
          progress_pct     = COALESCE(${progress_pct    ?? null}, progress_pct),
          estimated_time_s = COALESCE(${estimated_time_s ?? null}, estimated_time_s),
          completed_at     = COALESCE(${completed_at ? completed_at : null}::timestamptz, completed_at)
        WHERE session_token = ${session_token}
        RETURNING id, status, progress_pct, completed_at
      `
      if (!row) return err('session not found', 404)
      return ok(row)
    }

    return err('method not allowed', 405)

  } catch (e) {
    console.error('[fn/session]', e.message)
    return err('internal error', 500)
  }
}
