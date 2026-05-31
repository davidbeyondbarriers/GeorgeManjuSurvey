/**
 * Persistence — localStorage autosave + Netlify Functions DB layer
 *
 * localStorage is the primary store (always works, survives offline).
 * API calls to /api/* are fire-and-forget — they never block or break the survey.
 * The DB layer activates automatically on Netlify; it's a no-op in local dev
 * where NETLIFY_DATABASE_URL is not set.
 */

const STORAGE_KEY = 'gm_survey_v1'
const TOKEN_KEY   = 'gm_session_token'

// ── localStorage ──────────────────────────────────────────────────────────────

export function saveState (state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }))
  } catch { /* quota / private mode — degrade silently */ }
}

export function loadState () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw)
    const AGE_LIMIT = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - state.savedAt > AGE_LIMIT) { clearState(); return null }
    return state
  } catch { return null }
}

export function clearState () {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

export function hasSavedState () {
  return loadState() !== null
}

// ── Session token ─────────────────────────────────────────────────────────────

function getOrCreateToken () {
  try {
    let token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      token = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(TOKEN_KEY, token)
    }
    return token
  } catch { return `tmp-${Date.now()}` }
}

// ── Fetch helpers (fire-and-forget — never throw into survey flow) ─────────────

function _post (path, body) {
  try {
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(() => {})
  } catch { /* offline */ }
}

function _patch (path, body) {
  try {
    fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(() => {})
  } catch { /* offline */ }
}

// ── Public DB API ─────────────────────────────────────────────────────────────

/**
 * Call once when the survey starts — creates a DB session row.
 * Captures device, browser, OS, screen, language, UTM params.
 */
export function initSession () {
  const ua     = navigator.userAgent
  const w      = screen.width
  const h      = screen.height
  const params = new URLSearchParams(location.search)

  _post('/api/session', {
    session_token: getOrCreateToken(),
    device_type:   w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop',
    browser:       _parseBrowser(ua),
    os:            _parseOS(ua),
    screen_width:  w,
    screen_height: h,
    language:      navigator.language ?? null,
    referrer:      document.referrer  || null,
    utm_source:    params.get('utm_source'),
    utm_medium:    params.get('utm_medium'),
    utm_campaign:  params.get('utm_campaign')
  })
}

/**
 * Save a single question answer to the DB.
 * @param {Object} response  — must include question_id and question_type
 */
export function saveResponse (response) {
  _post('/api/response', {
    session_token: getOrCreateToken(),
    ...response
  })
}

/**
 * Log an analytics event (mirrors the front-end track() call server-side).
 * @param {string} event_name
 * @param {Object} [properties]
 */
export function logEvent (event_name, properties = {}) {
  _post('/api/event', {
    session_token: getOrCreateToken(),
    event_name,
    properties,
    chapter_id:  properties.chapter  ?? null,
    question_id: properties.question ?? null
  })
}

/**
 * Update session progress after each answer — throttle at call site if needed.
 * @param {Object} opts
 */
export function updateProgress ({ currentChapter, currentQuestion, progressPct, estimatedTimeS } = {}) {
  _patch('/api/session', {
    session_token:    getOrCreateToken(),
    current_chapter:  currentChapter  ?? null,
    current_question: currentQuestion ?? null,
    progress_pct:     progressPct     ?? null,
    estimated_time_s: estimatedTimeS  ?? null
  })
}

/**
 * Mark the survey complete and erase the localStorage save.
 */
export function completeSession () {
  _patch('/api/session', {
    session_token: getOrCreateToken(),
    status:        'completed',
    completed_at:  new Date().toISOString(),
    progress_pct:  100
  })
  clearState()
}

// ── UA parsers (no external lib) ──────────────────────────────────────────────

function _parseBrowser (ua) {
  if (/Edg\//.test(ua))     return 'Edge'
  if (/OPR\//.test(ua))     return 'Opera'
  if (/Chrome\//.test(ua))  return 'Chrome'
  if (/Safari\//.test(ua))  return 'Safari'
  if (/Firefox\//.test(ua)) return 'Firefox'
  return 'Other'
}

function _parseOS (ua) {
  if (/Windows/.test(ua))     return 'Windows'
  if (/iPhone|iPad/.test(ua)) return 'iOS'
  if (/Android/.test(ua))     return 'Android'
  if (/Mac OS X/.test(ua))    return 'macOS'
  if (/Linux/.test(ua))       return 'Linux'
  return 'Other'
}
