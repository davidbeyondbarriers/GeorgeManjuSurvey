/**
 * main.js — Boot order
 *
 * 1. Detect device type and track
 * 2. Render hero (static — no JS deps)
 * 3. Lazy-load Three.js hero scene (non-blocking)
 * 4. On CTA click → show motivation → show survey
 */

import { track, setProfile } from './analytics/track.js'
import { loadState, clearState } from './persistence/autosave.js'
import { initHero } from './components/hero.js'
import { initSurvey } from './engine/survey-engine.js'
import { showSection, hideSection } from './engine/navigation.js'
import surveyData from './data/survey.json'

// ── DEVICE PROFILING ──────────────────────────────────────────────────────────
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
setProfile({ device_type: isMobile ? 'mobile' : 'desktop' })

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const heroEl       = document.getElementById('hero')
const motivationEl = document.getElementById('motivation')
const surveyEl     = document.getElementById('survey-main')
const stageEl      = document.getElementById('survey-stage')
const motivCTA     = document.getElementById('motivation-cta')

// ── BOOT ──────────────────────────────────────────────────────────────────────
async function boot () {
  // Hero
  initHero({
    guidesData: surveyData.guides,
    bubbles:    surveyData.hero.bubbles,
    onStart:    () => _enterMotivation()
  })

  // Three.js scene — lazy, non-blocking
  import('./three/hero-scene.js')
    .then(({ initHeroScene }) => {
      const canvas = document.getElementById('hero-canvas')
      initHeroScene(canvas)
    })
    .catch(() => { /* WebGL or Three.js unavailable — hero still looks great */ })
}

// ── MOTIVATION ────────────────────────────────────────────────────────────────
async function _enterMotivation () {
  await hideSection(heroEl)
  showSection(motivationEl)
  motivationEl.scrollIntoView({ behavior: 'smooth' })
}

motivCTA?.addEventListener('click', _enterSurvey, { once: true })

// ── SURVEY INIT ───────────────────────────────────────────────────────────────
async function _enterSurvey () {
  await hideSection(motivationEl)
  showSection(surveyEl)
  surveyEl.scrollIntoView({ behavior: 'smooth' })

  // Check for saved state and offer resume
  const savedState = loadState()

  if (savedState && savedState.questionId) {
    const resumed = await _offerResume()
    if (!resumed) {
      clearState()
    }
    _startSurvey(resumed ? savedState : null)
  } else {
    _startSurvey(null)
  }
}

function _startSurvey (savedState) {
  initSurvey({
    data:        surveyData,
    stage:       stageEl,
    savedState,
    onComplete:  (responses) => {
      // TODO: POST responses to Supabase when backend is wired
      clearState()
      console.info('[Survey] Completed. Responses ready for submission:', responses)
    }
  })
}

// ── RESUME BANNER ─────────────────────────────────────────────────────────────
function _offerResume () {
  return new Promise(resolve => {
    const banner = document.createElement('div')
    banner.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: var(--z-toast);
      background: var(--clr-surface);
      border-top: 1px solid var(--clr-border);
      padding: var(--sp-4) var(--sp-6);
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--sp-4); box-shadow: var(--shadow-lg);
    `
    banner.setAttribute('role', 'dialog')
    banner.setAttribute('aria-label', 'Resume your previous progress')
    banner.innerHTML = `
      <p style="font-size:var(--text-sm);color:var(--clr-text-secondary);flex:1">
        👋 You have a survey in progress — would you like to pick up where you left off?
      </p>
      <div style="display:flex;gap:var(--sp-3);flex-shrink:0">
        <button class="btn btn--ghost" id="resume-no"  type="button">Start fresh</button>
        <button class="btn btn--primary" id="resume-yes" type="button">Resume</button>
      </div>
    `

    document.body.appendChild(banner)

    const cleanup = () => {
      banner.style.transition = 'transform 300ms ease'
      banner.style.transform  = 'translateY(100%)'
      setTimeout(() => banner.remove(), 320)
    }

    document.getElementById('resume-yes').addEventListener('click', () => {
      cleanup(); resolve(true)
    }, { once: true })

    document.getElementById('resume-no').addEventListener('click', () => {
      cleanup(); resolve(false)
    }, { once: true })
  })
}

// ── GO ────────────────────────────────────────────────────────────────────────
boot().catch(err => {
  console.error('[Boot] Failed to initialise survey:', err)
})
