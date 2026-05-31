import { getDatabase } from '@netlify/database'

const _db = getDatabase({ connectionString: process.env.NETLIFY_DATABASE_URL })
export const sql = _db.sql.bind(_db)
