// Seed script for local development verification.
// Usage: npm run seed
// Verify results at http://localhost:8080 (Adminer)

import { pool } from '../src/db/client.js'
import { randomUUID } from 'crypto'

const token = randomUUID()
const client = await pool.connect()

try {
  await client.query(`
    INSERT INTO sessions (
      session_token, device_type, browser, os,
      screen_width, screen_height, language, status
    ) VALUES ($1, 'desktop', 'Chrome', 'Windows', 1920, 1080, 'en-AU', 'in_progress')
    ON CONFLICT (session_token) DO NOTHING
  `, [token])

  await client.query(`
    INSERT INTO responses (
      session_token, question_id, question_text, question_type,
      chapter_id, chapter_title, answer_value, is_skipped, time_to_answer_s
    ) VALUES ($1, 'q_seed_1', 'How did you hear about us?', 'single_choice',
              'ch_background', 'Your Background', 'Word of mouth', false, 8)
  `, [token])

  await client.query(`
    INSERT INTO events (session_token, event_name, properties, chapter_id)
    VALUES ($1, 'survey_start', $2, 'ch_background')
  `, [token, JSON.stringify({ source: 'seed', environment: 'local' })])

  console.log('[seed] Created session_token:', token)
  console.log('[seed] Open Adminer → http://localhost:8080')
  console.log('[seed]   System: PostgreSQL | Server: db | User: survey | Password: survey | DB: survey')
} finally {
  client.release()
  await pool.end()
}
