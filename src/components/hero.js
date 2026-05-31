/**
 * Hero component — George & Manju welcome screen
 *
 * Renders animated chat bubbles, then fires onStart when the CTA is clicked.
 * Three.js scene is injected separately (lazy) into #hero-canvas.
 */

import { track } from '../analytics/track.js'

const BUBBLE_DELAY_MS = 700 // gap between each bubble appearing

/**
 * Initialise the hero section.
 * @param {Object} opts
 * @param {Object}   opts.guidesData  - guides config from survey.json
 * @param {Array}    opts.bubbles     - hero.bubbles from survey.json
 * @param {Function} opts.onStart     - Called when user clicks CTA
 */
export function initHero ({ guidesData, bubbles, onStart }) {
  const bubblesEl = document.getElementById('hero-bubbles')
  const ctaEl     = document.getElementById('hero-cta')

  if (!bubblesEl || !ctaEl) return

  // Render bubbles staggered
  _renderBubblesStaggered(bubblesEl, bubbles, guidesData)

  // CTA
  ctaEl.addEventListener('click', () => {
    track('survey_start')
    ctaEl.disabled = true
    ctaEl.innerHTML = `
      <svg class="btn__icon spin" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="10"/>
      </svg>
      Starting…`
    onStart()
  }, { once: true })
}

function _renderBubblesStaggered (container, bubbles, guidesData) {
  container.innerHTML = ''

  bubbles.forEach((bubble, i) => {
    const el = _createBubble(bubble, guidesData)
    el.style.transitionDelay = `${i * BUBBLE_DELAY_MS + 800}ms`
    container.appendChild(el)

    // Trigger visible class after a tick so CSS transition fires
    setTimeout(() => {
      el.classList.add('bubble--visible')
    }, i * BUBBLE_DELAY_MS + 820)
  })
}

function _createBubble (bubble, guidesData) {
  const guide = guidesData[bubble.guide]
  const isRight = bubble.align === 'right'

  const el = document.createElement('div')
  el.className = `bubble${isRight ? ' bubble--right' : ''}`
  el.setAttribute('role', 'text')
  el.setAttribute('aria-label', `${guide.name}: ${bubble.text}`)

  el.innerHTML = `
    <div class="bubble__avatar" aria-hidden="true">${guide.emoji}</div>
    <div class="bubble__body">
      <p class="bubble__speaker">${guide.name}</p>
      <p class="bubble__text">${bubble.text}</p>
    </div>
  `
  return el
}
