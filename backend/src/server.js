import express        from 'express'
import cors           from 'cors'
import helmet         from 'helmet'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync }    from 'fs'
import { runMigrations } from '../db/migrate.js'
import sessionRoutes  from './routes/session.js'
import responseRoutes from './routes/response.js'
import eventRoutes    from './routes/event.js'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const PORT       = process.env.PORT    || 3000
const ORIGIN     = process.env.CORS_ORIGIN || '*'
const startedAt  = Date.now()

const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: ORIGIN, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'] }))
app.use(express.json({ limit: '100kb' }))

// ── API routes ────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.floor((Date.now() - startedAt) / 1000) })
})

app.use('/api', sessionRoutes)
app.use('/api', responseRoutes)
app.use('/api', eventRoutes)

// ── Static frontend (production only) ────────────────────────────────────────
// In dev, Vite serves the frontend on port 5200 and proxies /api to this server.
// In production (Docker image), Express serves the compiled dist/ directly.

const distDir = join(__dirname, '../../dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distDir, 'index.html'))
    }
  })
}

// ── Start ─────────────────────────────────────────────────────────────────────

async function start () {
  try {
    await runMigrations()
  } catch (err) {
    console.error('[startup] Migration failed — aborting:', err.message)
    process.exit(1)
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] Listening on http://0.0.0.0:${PORT}`)
    console.log(`[api] Health: http://0.0.0.0:${PORT}/api/health`)
    console.log(`[api] CORS origin: ${ORIGIN}`)
  })
}

// Export app for tests — tests import this module and create their own server.
// start() is only called when executed directly (node backend/src/server.js).
export { app }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start()
}
