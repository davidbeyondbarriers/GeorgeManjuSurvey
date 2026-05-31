import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../src/db/client.js'

const __dirname    = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS   = join(__dirname, 'migrations')

export async function runMigrations () {
  const client = await pool.connect()
  try {
    // Tracking table — created once, idempotent
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL       PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)

    const { rows } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename'
    )
    const applied = new Set(rows.map(r => r.filename))

    const files = (await readdir(MIGRATIONS))
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      if (applied.has(file)) continue

      const sql = await readFile(join(MIGRATIONS, file), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')
        console.log(`[migrate] ✓ ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration "${file}" failed: ${err.message}`)
      }
    }

    console.log('[migrate] All migrations up to date')
  } finally {
    client.release()
  }
}

// Standalone: node backend/db/migrate.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => pool.end())
    .catch(err => { console.error(err.message); process.exit(1) })
}
