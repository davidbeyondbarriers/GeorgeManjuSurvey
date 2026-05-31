/**
 * POST /api/response — save one question answer
 *
 * Looks up the session by session_token (never exposes internal UUIDs to the browser),
 * then inserts into survey_responses.
 * The auto_flag_too_fast trigger fires automatically on the DB side.
 */

import { sql } from '../../db/index.js'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
}

const ok  = (data, status = 201) => ({ statusCode: status, headers: HEADERS, body: JSON.stringify(data) })
const err = (msg,  status = 400) => ({ statusCode: status, headers: HEADERS, body: JSON.stringify({ error: msg }) })

const VALID_TYPES = new Set([
  'single_choice', 'multiple_choice', 'likert', 'rating',
  'short_text', 'long_text', 'dropdown', 'date', 'boolean'
])

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' }
  if (event.httpMethod !== 'POST')    return err('method not allowed', 405)

  const body = JSON.parse(event.body || '{}')
  const {
    session_token, question_id, question_text, question_type,
    chapter_id, chapter_title, answer_value, answer_label,
    answer_numeric, answer_array, is_skipped,
    time_to_answer_s, revision_count
  } = body

  if (!session_token)                      return err('session_token required')
  if (!question_id)                        return err('question_id required')
  if (!question_type || !VALID_TYPES.has(question_type)) return err('invalid question_type')

  try {
    const [session] = await sql`
      SELECT id FROM survey_sessions WHERE session_token = ${session_token}
    `
    if (!session) return err('session not found', 404)

    const [row] = await sql`
      INSERT INTO survey_responses (
        session_id, question_id, question_text, question_type,
        chapter_id, chapter_title, answer_value, answer_label,
        answer_numeric, answer_array, is_skipped,
        time_to_answer_s, revision_count
      ) VALUES (
        ${session.id},
        ${question_id},
        ${question_text   ?? null},
        ${question_type},
        ${chapter_id      ?? null},
        ${chapter_title   ?? null},
        ${answer_value    ?? null},
        ${answer_label    ?? null},
        ${answer_numeric  ?? null},
        ${answer_array    ?? null},
        ${is_skipped      ?? false},
        ${time_to_answer_s ?? null},
        ${revision_count  ?? 0}
      )
      RETURNING id, question_id, answered_at
    `
    return ok(row)

  } catch (e) {
    console.error('[fn/response]', e.message)
    return err('internal error', 500)
  }
}
