import { getDatabase } from '@netlify/database'

const _db = getDatabase()
export const sql = _db.sql.bind(_db)
