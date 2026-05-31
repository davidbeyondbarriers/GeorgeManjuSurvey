import { Router } from 'express'
import { z }      from 'zod'
import { pool }   from '../db/client.js'

const router = Router()

// ── Schema ────────────────────────────────────────────────────────────────────

const ResponseSchema = z.object({
  session_token:    z.string().uuid(),
  question_id:      z.string().max(100),
  question_text:    z.string().nullable().optional(),
  question_type:    z.string().max(50).nullable().optional(),
  chapter_id:       z.string().max(100).nullable().optional(),
  chapter_title:    z.string().max(255).nullable().optional(),
  answer_value:     z.string().nullable().optional(),
  answer_label:     z.string().nullable().optional(),
  answer_numeric:   z.number().nullable().optional(),
  answer_array:     z.array(z.unknown()).nullable().optional(),
  is_skipped:       z.boolean().default(false),
  time_to_answer_s: z.number().int().nonnegative().nullable().optional(),
  revision_count:   z.number().int().nonnegative().default(0)
})

// ── POST /api/response ────────────────────────────────────────────────────────

router.post('/response', (req, res) => {
  const parsed = ResponseSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  res.status(202).end()
  _save(parsed.data).catch(err => console.error('[response.save]', err.message))
})

// ── DB helper ─────────────────────────────────────────────────────────────────

async function _save (data) {
  await pool.query(
    `INSERT INTO responses (
       session_token, question_id, question_text, question_type,
       chapter_id, chapter_title, answer_value, answer_label,
       answer_numeric, answer_array, is_skipped, time_to_answer_s, revision_count
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      data.session_token,
      data.question_id,
      data.question_text    ?? null,
      data.question_type    ?? null,
      data.chapter_id       ?? null,
      data.chapter_title    ?? null,
      data.answer_value     ?? null,
      data.answer_label     ?? null,
      data.answer_numeric   ?? null,
      data.answer_array != null ? JSON.stringify(data.answer_array) : null,
      data.is_skipped,
      data.time_to_answer_s ?? null,
      data.revision_count
    ]
  )
}

export default router
