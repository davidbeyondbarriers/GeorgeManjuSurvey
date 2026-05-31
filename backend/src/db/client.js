import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString:      process.env.DATABASE_URL,
  max:                   10,
  idleTimeoutMillis:     30_000,
  connectionTimeoutMillis: 2_000
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message)
})
