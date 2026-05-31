// Validation Tests — verify malformed payloads are rejected with 400.
// No database required for these tests.
//
// Run:  npm test
// Run single file:  node --test backend/tests/validation.test.js

import { describe, test, before, after } from 'node:test'
import assert                            from 'node:assert/strict'
import { createServer }                  from 'node:http'

const GOOD_TOKEN = '550e8400-e29b-41d4-a716-446655440010'

let server
let base

async function req (method, path, body) {
  return fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  })
}

async function assertBadRequest (res) {
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.ok(body.error, 'Response must include an error object')
  return body
}

describe('Validation — 400 on malformed payloads', () => {
  before(async () => {
    const { app } = await import('../src/server.js')
    server = createServer(app)
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(() => new Promise(resolve => server.close(resolve)))

  // ── POST /api/session ───────────────────────────────────────────────────────

  test('POST /api/session — empty body → 400', async () => {
    const res = await req('POST', '/api/session', {})
    await assertBadRequest(res)
  })

  test('POST /api/session — missing session_token → 400', async () => {
    const res = await req('POST', '/api/session', { device_type: 'desktop' })
    await assertBadRequest(res)
  })

  test('POST /api/session — invalid UUID format → 400', async () => {
    const res = await req('POST', '/api/session', { session_token: 'not-a-uuid' })
    await assertBadRequest(res)
  })

  test('POST /api/session — numeric session_token → 400', async () => {
    const res = await req('POST', '/api/session', { session_token: 12345 })
    await assertBadRequest(res)
  })

  test('POST /api/session — invalid device_type enum → 400', async () => {
    const res = await req('POST', '/api/session', {
      session_token: GOOD_TOKEN,
      device_type:   'smartwatch'
    })
    await assertBadRequest(res)
  })

  // ── PATCH /api/session ──────────────────────────────────────────────────────

  test('PATCH /api/session — missing session_token → 400', async () => {
    const res = await req('PATCH', '/api/session', { progress_pct: 50 })
    await assertBadRequest(res)
  })

  test('PATCH /api/session — invalid UUID → 400', async () => {
    const res = await req('PATCH', '/api/session', { session_token: 'bad' })
    await assertBadRequest(res)
  })

  test('PATCH /api/session — invalid status enum → 400', async () => {
    const res = await req('PATCH', '/api/session', {
      session_token: GOOD_TOKEN,
      status:        'done'
    })
    await assertBadRequest(res)
  })

  test('PATCH /api/session — progress_pct above 100 → 400', async () => {
    const res = await req('PATCH', '/api/session', {
      session_token: GOOD_TOKEN,
      progress_pct:  150
    })
    await assertBadRequest(res)
  })

  test('PATCH /api/session — negative progress_pct → 400', async () => {
    const res = await req('PATCH', '/api/session', {
      session_token: GOOD_TOKEN,
      progress_pct:  -5
    })
    await assertBadRequest(res)
  })

  // ── POST /api/response ──────────────────────────────────────────────────────

  test('POST /api/response — empty body → 400', async () => {
    const res = await req('POST', '/api/response', {})
    await assertBadRequest(res)
  })

  test('POST /api/response — missing question_id → 400', async () => {
    const res = await req('POST', '/api/response', {
      session_token: GOOD_TOKEN
    })
    await assertBadRequest(res)
  })

  test('POST /api/response — invalid session_token → 400', async () => {
    const res = await req('POST', '/api/response', {
      session_token: 'bad-uuid',
      question_id:   'q_test'
    })
    await assertBadRequest(res)
  })

  test('POST /api/response — revision_count is negative → 400', async () => {
    const res = await req('POST', '/api/response', {
      session_token:  GOOD_TOKEN,
      question_id:    'q_test',
      revision_count: -1
    })
    await assertBadRequest(res)
  })

  // ── POST /api/event ─────────────────────────────────────────────────────────

  test('POST /api/event — empty body → 400', async () => {
    const res = await req('POST', '/api/event', {})
    await assertBadRequest(res)
  })

  test('POST /api/event — missing session_token → 400', async () => {
    const res = await req('POST', '/api/event', { event_name: 'survey_start' })
    await assertBadRequest(res)
  })

  test('POST /api/event — missing event_name → 400', async () => {
    const res = await req('POST', '/api/event', { session_token: GOOD_TOKEN })
    await assertBadRequest(res)
  })

  test('POST /api/event — invalid session_token → 400', async () => {
    const res = await req('POST', '/api/event', {
      session_token: 'not-uuid',
      event_name:    'survey_start'
    })
    await assertBadRequest(res)
  })

  // ── Error format ────────────────────────────────────────────────────────────

  test('400 error body contains fieldErrors object', async () => {
    const res  = await req('POST', '/api/session', { session_token: 'bad' })
    const body = await assertBadRequest(res)
    assert.ok(body.error.fieldErrors, 'Must include fieldErrors from zod.flatten()')
  })
})
