/**
 * Persistence — localStorage autosave / resume
 *
 * Saves the full survey state so a page refresh never loses progress.
 * The Supabase adapter will live alongside this once the backend lands;
 * the front-end engine only calls saveState() / loadState() — no changes needed.
 */

const STORAGE_KEY = 'gm_survey_v1'

/**
 * Persist the current survey state.
 * @param {Object} state
 */
export function saveState (state) {
  try {
    const serialised = JSON.stringify({
      ...state,
      savedAt: Date.now()
    })
    localStorage.setItem(STORAGE_KEY, serialised)
  } catch {
    // localStorage might be unavailable (private mode quota, etc.) — degrade silently
  }
}

/**
 * Load a previously saved state, or null if none exists.
 * @returns {Object|null}
 */
export function loadState () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw)
    // Discard saves older than 7 days
    const AGE_LIMIT = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - state.savedAt > AGE_LIMIT) {
      clearState()
      return null
    }
    return state
  } catch {
    return null
  }
}

/**
 * Erase any saved state (e.g. after successful submission).
 */
export function clearState () {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

/**
 * Check whether a save exists without loading it.
 * @returns {boolean}
 */
export function hasSavedState () {
  return loadState() !== null
}
