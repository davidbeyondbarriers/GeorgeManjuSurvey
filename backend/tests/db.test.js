// Database Persistence Tests — verify records are actually written to PostgreSQL.
// Requires the Docker Compose stack to be running:
//
//   docker compose -f infrastructure/docker/docker-compose.yml up -d
//   npm run migrate      (first run only — docker compose does this automatically)
//   npm test             (or: node --test backend/tests/db.test.js)
//
// Tests are automatically skipped if DATABASE_URL is not set.

import { describe, test, before, after } from 'node:test'
import assert                            from 'node:assert/strict'
import { createServer }                  from 'node:http'
import { randomUUID }                    from 'crypto'

const DB_AVAILABLE = !!process.env.DATABASE_URL
const SKIP_REASON  = 'DATABASE_URL not set — run: docker compose -f infrastructure/docker/docker-compose.yml up'

// One unique token per test run to avoid cross-test contamination
const TOKEN = randomUUID()

let server
let base
let pool

async function req (method, path, body) {
  return fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  })
}

// Wait for async DB write — routes return 202 before the write completes
async function wait (ms = 250) {
  return new Promise(r => setTimeout(r, ms))
}

describe('DB persistence', { skip: !DB_AVAILABLE && SKIP_REASON }, () => {
  before(async () => {
    const [{ app }, { pool: p }] = await Promise.all([
      import('../src/server.js'),
      import('../src/db/client.js')
    ])
    pool   = p
    server = createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`

    // Create the session row that subsequent tests depend on
    await req('POST', '/api/session', {
      session_token: TOKEN,
      device_type:   'desktop',
      browser:       'Chrome',
      os:            'Windows',
      screen_width:  1920,
      screen_height: 1080,
      language:      'en-AU',
      referrer:      null,
      utm_source:    'test',
      utm_medium:    null,
      utm_campaign:  null
    })
    await wait()
  })

  after(async () => {
    // Clean up test rows
    await pool.query('DELETE FROM events    WHERE session_token = $1', [TOKEN])
    await pool.query('DELETE FROM responses WHERE session_token = $1', [TOKEN])
    await pool.query('DELETE FROM sessions  WHERE session_token = $1', [TOKEN])
    await pool.end()
    await new Promise(r => server.close(r))
  })

  // ── sessions table ──────────────────────────────────────────────────────────

  test('POST /api/session — session row is created', async () => {
    const { rows } = await pool.query(
      'SELECT * FROM sessions WHERE session_token = $1',
      [TOKEN]
    )
    assert.equal(rows.length, 1, 'Exactly one session row must exist')
    assert.equal(rows[0].browser,     'Chrome')
    assert.equal(rows[0].os,          'Windows')
    assert.equal(rows[0].device_type, 'desktop')
    assert.equal(rows[0].status,      'in_progress')
    assert.ok(rows[0].expires_at > new Date(), 'expires_at must be in the future')
  })

  test('POST /api/session — idempotent on duplicate token', async () => {
    // Second POST with same token must not throw or create a second row
    const res = await req('POST', '/api/session', { session_token: TOKEN })
    assert.equal(res.status, 202)
    await wait()

    const { rows } = await pool.query(
      'SELECT COUNT(*) AS n FROM sessions WHERE session_token = $1',
      [TOKEN]
    )
    assert.equal(Number(rows[0].n), 1, 'Duplicate POST must not insert a second row')
  })

  test('PATCH /api/session — progress fields are updated', async () => {
    await req('PATCH', '/api/session', {
      session_token:    TOKEN,
      current_chapter:  'ch_background',
      current_question: 'q_age',
      progress_pct:     33,
      estimated_time_s: 240
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT current_chapter, current_question, progress_pct, estimated_time_s FROM sessions WHERE session_token = $1',
      [TOKEN]
    )
    assert.equal(rows[0].current_chapter,  'ch_background')
    assert.equal(rows[0].current_question, 'q_age')
    assert.equal(Number(rows[0].progress_pct), 33)
    assert.equal(rows[0].estimated_time_s, 240)
  })

  test('PATCH /api/session — completion sets status and completed_at', async () => {
    const completedAt = new Date().toISOString()
    await req('PATCH', '/api/session', {
      session_token: TOKEN,
      status:        'completed',
      completed_at:  completedAt,
      progress_pct:  100
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT status, progress_pct, completed_at FROM sessions WHERE session_token = $1',
      [TOKEN]
    )
    assert.equal(rows[0].status, 'completed')
    assert.equal(Number(rows[0].progress_pct), 100)
    assert.ok(rows[0].completed_at instanceof Date)
  })

  // ── responses table ─────────────────────────────────────────────────────────

  test('POST /api/response — response row is created', async () => {
    await req('POST', '/api/response', {
      session_token:    TOKEN,
      question_id:      'q_db_test_1',
      question_text:    'DB test question',
      question_type:    'single_choice',
      chapter_id:       'ch_background',
      chapter_title:    'Your Background',
      answer_value:     'Melbourne',
      answer_label:     null,
      answer_numeric:   null,
      answer_array:     null,
      is_skipped:       false,
      time_to_answer_s: 8,
      revision_count:   0
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT * FROM responses WHERE session_token = $1 AND question_id = $2',
      [TOKEN, 'q_db_test_1']
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].answer_value,     'Melbourne')
    assert.equal(rows[0].question_type,    'single_choice')
    assert.equal(rows[0].is_skipped,       false)
    assert.equal(rows[0].time_to_answer_s, 8)
    assert.equal(rows[0].revision_count,   0)
  })

  test('POST /api/response — answer_numeric stored for rating question', async () => {
    await req('POST', '/api/response', {
      session_token: TOKEN,
      question_id:   'q_db_rating',
      question_type: 'rating',
      answer_value:  '8',
      answer_numeric: 8,
      is_skipped:    false,
      revision_count: 0
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT answer_numeric FROM responses WHERE session_token = $1 AND question_id = $2',
      [TOKEN, 'q_db_rating']
    )
    assert.equal(Number(rows[0].answer_numeric), 8)
  })

  test('POST /api/response — answer_array stored as JSONB', async () => {
    await req('POST', '/api/response', {
      session_token: TOKEN,
      question_id:   'q_db_multi',
      question_type: 'single_choice',
      answer_value:  'work,family,health',
      answer_array:  ['work', 'family', 'health'],
      is_skipped:    false,
      revision_count: 0
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT answer_array FROM responses WHERE session_token = $1 AND question_id = $2',
      [TOKEN, 'q_db_multi']
    )
    assert.deepEqual(rows[0].answer_array, ['work', 'family', 'health'])
  })

  test('POST /api/response — skipped question is recorded', async () => {
    await req('POST', '/api/response', {
      session_token: TOKEN,
      question_id:   'q_db_skipped',
      question_type: 'story',
      answer_value:  null,
      is_skipped:    true,
      revision_count: 0
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT is_skipped FROM responses WHERE session_token = $1 AND question_id = $2',
      [TOKEN, 'q_db_skipped']
    )
    assert.equal(rows[0].is_skipped, true)
  })

  // ── events table ────────────────────────────────────────────────────────────

  test('POST /api/event — event row is created', async () => {
    await req('POST', '/api/event', {
      session_token: TOKEN,
      event_name:    'chapter_view',
      properties:    { chapter: 'ch_background', chapter_index: 0 },
      chapter_id:    'ch_background',
      question_id:   null
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT * FROM events WHERE session_token = $1 AND event_name = $2',
      [TOKEN, 'chapter_view']
    )
    assert.equal(rows.length, 1)
    assert.deepEqual(rows[0].properties,  { chapter: 'ch_background', chapter_index: 0 })
    assert.equal(rows[0].chapter_id,      'ch_background')
    assert.equal(rows[0].question_id,     null)
  })

  test('POST /api/event — null properties stored as NULL (not {})', async () => {
    await req('POST', '/api/event', {
      session_token: TOKEN,
      event_name:    'survey_start',
      properties:    null,
      chapter_id:    null,
      question_id:   null
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT properties FROM events WHERE session_token = $1 AND event_name = $2',
      [TOKEN, 'survey_start']
    )
    assert.equal(rows[0].properties, null)
  })

  test('POST /api/event — survey_complete event is persisted', async () => {
    await req('POST', '/api/event', {
      session_token: TOKEN,
      event_name:    'survey_complete',
      properties:    { completion_time_seconds: 480, questions_answered: 20 },
      chapter_id:    null,
      question_id:   null
    })
    await wait()

    const { rows } = await pool.query(
      'SELECT properties FROM events WHERE session_token = $1 AND event_name = $2',
      [TOKEN, 'survey_complete']
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].properties.completion_time_seconds, 480)
  })
})
