import { neon } from '@netlify/database'

export const sql = neon(process.env.NETLIFY_DATABASE_URL)
