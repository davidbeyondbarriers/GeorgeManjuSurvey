// API Contract Tests — verify all four endpoints accept valid payloads and
// return 202 Accepted. These tests do NOT require a running database.
// The API routes respond 202 before the async DB write, so no DB = no failures.
//
// Run:  npm test
// Run single file:  node --test backend/tests/api.contract.test.js

import { describe, test, before, after } from 'node:test'
import assert                            from 'node:assert/strict'
import { createServer }                  from 'node:http'

// Stable UUID used across all contract tests
const TOKEN = '550e8400-e29b-41d4-a716-446655440001'

let server
let base

async function req (method, path, body) {
  return fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  })
}

describe('API contract — 202 on valid payloads', () => {
  before(async () => {
    const { app } = await import('../src/server.js')
    server = createServer(app)
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(() => new Promise(resolve => server.close(resolve)))

  // ── Health ──────────────────────────────────────────────────────────────────

  test('GET /api/health → 200 with {status, uptime}', async () => {
    const res = await fetch(`${base}/api/health`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.status, 'ok')
    assert.equal(typeof body.uptime, 'number')
  })

  // ── POST /api/session ───────────────────────────────────────────────────────

  test('POST /api/session — full payload → 202', async () => {
    const res = await req('POST', '/api/session', {
      session_token: TOKEN,
      device_type:   'desktop',
      browser:       'Chrome',
      os:            'Windows',
      screen_width:  1920,
      screen_height: 1080,
      language:      'en-AU',
      referrer:      'https://example.com',
      utm_source:    'email',
      utm_medium:    'newsletter',
      utm_campaign:  'survey-launch-2026'
    })
    assert.equal(res.status, 202)
  })

  test('POST /api/session — minimal payload (token only) → 202', async () => {
    const res = await req('POST', '/api/session', {
      session_token: '550e8400-e29b-41d4-a716-446655440002'
    })
    assert.equal(res.status, 202)
  })

  test('POST /api/session — null optional fields → 202', async () => {
    const res = await req('POST', '/api/session', {
      session_token: '550e8400-e29b-41d4-a716-446655440003',
      device_type:   null,
      browser:       null,
      language:      null,
      referrer:      null,
      utm_source:    null
    })
    assert.equal(res.status, 202)
  })

  // ── PATCH /api/session ──────────────────────────────────────────────────────

  test('PATCH /api/session — progress update → 202', async () => {
    const res = await req('PATCH', '/api/session', {
      session_token:    TOKEN,
      current_chapter:  'ch_background',
      current_question: 'q_age',
      progress_pct:     25.5,
      estimated_time_s: 300
    })
    assert.equal(res.status, 202)
  })

  test('PATCH /api/session — completion → 202', async () => {
    const res = await req('PATCH', '/api/session', {
      session_token: TOKEN,
      status:        'completed',
      completed_at:  new Date().toISOString(),
      progress_pct:  100
    })
    assert.equal(res.status, 202)
  })

  test('PATCH /api/session — partial fields only → 202', async () => {
    const res = await req('PATCH', '/api/session', {
      session_token: TOKEN,
      progress_pct:  50
    })
    assert.equal(res.status, 202)
  })

  // ── POST /api/response ──────────────────────────────────────────────────────

  test('POST /api/response — full payload (single-choice) → 202', async () => {
    const res = await req('POST', '/api/response', {
      session_token:    TOKEN,
      question_id:      'q_location',
      question_text:    'Where do you currently live?',
      question_type:    'single_choice',
      chapter_id:       'ch_background',
      chapter_title:    'Your Background',
      answer_value:     'Melbourne',
      answer_label:     null,
      answer_numeric:   null,
      answer_array:     null,
      is_skipped:       false,
      time_to_answer_s: 12,
      revision_count:   0
    })
    assert.equal(res.status, 202)
  })

  test('POST /api/response — rating question (answer_numeric set) → 202', async () => {
    const res = await req('POST', '/api/response', {
      session_token:    TOKEN,
      question_id:      'q_wellbeing',
      question_type:    'rating',
      chapter_id:       'ch_wellbeing',
      answer_value:     '7',
      answer_numeric:   7,
      answer_array:     null,
      is_skipped:       false,
      time_to_answer_s: 4,
      revision_count:   0
    })
    assert.equal(res.status, 202)
  })

  test('POST /api/response — skipped question → 202', async () => {
    const res = await req('POST', '/api/response', {
      session_token:  TOKEN,
      question_id:    'q_optional',
      question_type:  'story',
      answer_value:   null,
      is_skipped:     true,
      revision_count: 0
    })
    assert.equal(res.status, 202)
  })

  test('POST /api/response — multi-select (answer_array populated) → 202', async () => {
    const res = await req('POST', '/api/response', {
      session_token: TOKEN,
      question_id:   'q_challenges',
      question_type: 'single_choice',
      answer_value:  'work,family,health',
      answer_array:  ['work', 'family', 'health'],
      is_skipped:    false,
      revision_count: 0
    })
    assert.equal(res.status, 202)
  })

  // ── POST /api/event ─────────────────────────────────────────────────────────

  test('POST /api/event — chapter_view → 202', async () => {
    const res = await req('POST', '/api/event', {
      session_token: TOKEN,
      event_name:    'chapter_view',
      properties:    { chapter: 'ch_background', chapter_index: 0 },
      chapter_id:    'ch_background',
      question_id:   null
    })
    assert.equal(res.status, 202)
  })

  test('POST /api/event — survey_complete → 202', async () => {
    const res = await req('POST', '/api/event', {
      session_token: TOKEN,
      event_name:    'survey_complete',
      properties:    { completion_time_seconds: 720, questions_answered: 18 },
      chapter_id:    null,
      question_id:   null
    })
    assert.equal(res.status, 202)
  })

  test('POST /api/event — null properties → 202', async () => {
    const res = await req('POST', '/api/event', {
      session_token: TOKEN,
      event_name:    'survey_start',
      properties:    null,
      chapter_id:    null,
      question_id:   null
    })
    assert.equal(res.status, 202)
  })
})
