import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.NETLIFY_DATABASE_URL)
