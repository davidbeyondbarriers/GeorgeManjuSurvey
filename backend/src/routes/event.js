import { Router } from 'express'
import { z }      from 'zod'
import { pool }   from '../db/client.js'

const router = Router()

// ── Schema ────────────────────────────────────────────────────────────────────

const EventSchema = z.object({
  session_token: z.string().uuid(),
  event_name:    z.string().max(100),
  properties:    z.record(z.unknown()).nullable().optional(),
  chapter_id:    z.string().max(100).nullable().optional(),
  question_id:   z.string().max(100).nullable().optional()
})

// ── POST /api/event ───────────────────────────────────────────────────────────

router.post('/event', (req, res) => {
  const parsed = EventSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  res.status(202).end()
  _log(parsed.data).catch(err => console.error('[event.log]', err.message))
})

// ── DB helper ─────────────────────────────────────────────────────────────────

async function _log (data) {
  await pool.query(
    `INSERT INTO events (session_token, event_name, properties, chapter_id, question_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      data.session_token,
      data.event_name,
      data.properties != null ? JSON.stringify(data.properties) : null,
      data.chapter_id  ?? null,
      data.question_id ?? null
    ]
  )
}

export default router
