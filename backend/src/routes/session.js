import { Router } from 'express'
import { z }      from 'zod'
import { pool }   from '../db/client.js'

const router = Router()

// ── Schemas ───────────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  session_token: z.string().uuid(),
  device_type:   z.enum(['mobile', 'tablet', 'desktop']).nullable().optional(),
  browser:       z.string().max(20).nullable().optional(),
  os:            z.string().max(20).nullable().optional(),
  screen_width:  z.number().int().positive().nullable().optional(),
  screen_height: z.number().int().positive().nullable().optional(),
  language:      z.string().max(20).nullable().optional(),
  referrer:      z.string().max(2048).nullable().optional(),
  utm_source:    z.string().max(255).nullable().optional(),
  utm_medium:    z.string().max(255).nullable().optional(),
  utm_campaign:  z.string().max(255).nullable().optional()
})

const PatchSchema = z.object({
  session_token:    z.string().uuid(),
  status:           z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  current_chapter:  z.string().max(100).nullable().optional(),
  current_question: z.string().max(100).nullable().optional(),
  progress_pct:     z.number().min(0).max(100).nullable().optional(),
  estimated_time_s: z.number().int().nonnegative().nullable().optional(),
  completed_at:     z.string().datetime({ offset: true }).nullable().optional()
})

// ── POST /api/session ─────────────────────────────────────────────────────────

router.post('/session', (req, res) => {
  const parsed = CreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  res.status(202).end()
  _create(parsed.data).catch(err => console.error('[session.create]', err.message))
})

// ── PATCH /api/session ────────────────────────────────────────────────────────

router.patch('/session', (req, res) => {
  const parsed = PatchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  res.status(202).end()
  _update(parsed.data).catch(err => console.error('[session.update]', err.message))
})

// ── DB helpers ────────────────────────────────────────────────────────────────

async function _create (data) {
  await pool.query(
    `INSERT INTO sessions (
       session_token, device_type, browser, os,
       screen_width, screen_height, language, referrer,
       utm_source, utm_medium, utm_campaign
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (session_token) DO NOTHING`,
    [
      data.session_token,
      data.device_type   ?? null,
      data.browser       ?? null,
      data.os            ?? null,
      data.screen_width  ?? null,
      data.screen_height ?? null,
      data.language      ?? null,
      data.referrer      ?? null,
      data.utm_source    ?? null,
      data.utm_medium    ?? null,
      data.utm_campaign  ?? null
    ]
  )
}

async function _update (data) {
  const { session_token, ...rest } = data

  const ALLOWED = [
    'status', 'current_chapter', 'current_question',
    'progress_pct', 'estimated_time_s', 'completed_at'
  ]

  const fields = []
  const values = []
  let   idx    = 1

  for (const key of ALLOWED) {
    if (key in rest) {
      fields.push(`${key} = $${idx++}`)
      values.push(rest[key] ?? null)
    }
  }

  if (fields.length === 0) return

  fields.push(`updated_at = NOW()`)
  values.push(session_token)

  await pool.query(
    `UPDATE sessions SET ${fields.join(', ')} WHERE session_token = $${idx}`,
    values
  )
}

export default router
