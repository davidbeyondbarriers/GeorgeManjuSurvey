/**
 * Analytics — thin track() wrapper
 * Swap the provider by changing only this file.
 * Currently: console log + PostHog stub (wire VITE_POSTHOG_KEY to activate).
 *
 * Events:
 *   survey_start · chapter_view · question_view · question_answer
 *   question_skip · drop_off · survey_complete · completion_time · device_type
 */

import { logEvent } from '../persistence/autosave.js'

const POSTHOG_KEY = import.meta.env?.VITE_POSTHOG_KEY

let _ph = null

function _initPostHog () {
  if (!POSTHOG_KEY || _ph) return
  // PostHog snippet — loads asynchronously
  import('https://cdn.jsdelivr.net/npm/posthog-js@1/dist/posthog.esm.js')
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: 'https://app.posthog.com',
        autocapture: false,
        capture_pageview: false,
        persistence: 'memory'          // privacy-first: no cross-session ID
      })
      _ph = posthog
    })
    .catch(() => { /* PostHog unavailable — silently degrade */ })
}

_initPostHog()

/**
 * Track an analytics event.
 * @param {string} event  - Event name from the defined event map
 * @param {Object} [props] - Additional properties
 */
export function track (event, props = {}) {
  const payload = {
    ...props,
    timestamp: Date.now(),
    url: window.location.href
  }

  // PostHog
  if (_ph) {
    _ph.capture(event, payload)
  }

  // DB — server-side mirror via Netlify Function
  logEvent(event, props)

  // Dev-mode logging
  if (import.meta.env?.DEV) {
    console.debug(`[track] ${event}`, payload)
  }
}

/** Convenience: set persistent super-properties (e.g. device_type) */
export function setProfile (props = {}) {
  if (_ph) _ph.register(props)
  if (import.meta.env?.DEV) {
    console.debug('[track:profile]', props)
  }
}
