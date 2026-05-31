/**
 * POST /api/event — log one analytics event
 *
 * session_token is optional — events like page_view fire before a session exists.
 * All twelve defined event names are validated against an allowlist.
 */

import { sql } from '../../db/index.js'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
}

const err = (msg, status = 400) => ({ statusCode: status, headers: HEADERS, body: JSON.stringify({ error: msg }) })

const VALID_EVENTS = new Set([
  'survey_start', 'chapter_view', 'question_view', 'question_answer',
  'question_skip', 'drop_off', 'survey_complete', 'completion_time',
  'device_type', 'page_focus', 'page_blur', 'resume'
])

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' }
  if (event.httpMethod !== 'POST')    return err('method not allowed', 405)

  const body = JSON.parse(event.body || '{}')
  const { session_token, event_name, properties, chapter_id, question_id } = body

  if (!event_name || !VALID_EVENTS.has(event_name)) return err('invalid event_name')

  try {
    let session_id = null
    if (session_token) {
      const [session] = await sql`
        SELECT id FROM survey_sessions WHERE session_token = ${session_token}
      `
      session_id = session?.id ?? null
    }

    await sql`
      INSERT INTO analytics_events (session_id, event_name, properties, chapter_id, question_id)
      VALUES (
        ${session_id},
        ${event_name},
        ${properties ? JSON.stringify(properties) : null}::jsonb,
        ${chapter_id  ?? null},
        ${question_id ?? null}
      )
    `

    return { statusCode: 204, headers: HEADERS, body: '' }

  } catch (e) {
    console.error('[fn/event]', e.message)
    return err('internal error', 500)
  }
}
