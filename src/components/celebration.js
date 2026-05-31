/**
 * Celebration screen — genuine completion moment
 *
 * Full-viewport dark screen with George & Manju, confetti burst,
 * heartfelt message, and crisis resources reminder.
 */

import { renderCrisisCard } from './crisis.js'

/**
 * @param {Object} opts
 * @param {Object}   opts.surveyData      - Full survey config
 * @param {Object}   opts.responses       - Final response map
 * @param {number}   opts.completionTime  - Seconds taken
 * @param {Function} opts.onClose         - Optional callback
 * @returns {HTMLElement}
 */
export function renderCelebration ({ surveyData, responses, completionTime, onClose }) {
  const { completion, crisisResources } = surveyData

  const el = document.createElement('div')
  el.className = 'celebration'
  el.setAttribute('role', 'main')
  el.setAttribute('aria-label', 'Survey complete')

  const minutes = Math.round(completionTime / 60)
  const timeMsg = minutes < 1
    ? 'under a minute'
    : `${minutes} minute${minutes === 1 ? '' : 's'}`

  el.innerHTML = `
    <div class="celebration__confetti" aria-hidden="true">🌱</div>

    <div class="celebration__guides">
      <img src="/assets/george-manju.png"
           alt="George and Manju"
           loading="lazy" />
    </div>

    <h1 class="celebration__title anim-fade-up">
      ${completion.title}
    </h1>

    <p class="celebration__message anim-fade-up" style="animation-delay:150ms">
      ${completion.message}
    </p>

    <p class="celebration__sub anim-fade-up" style="animation-delay:300ms">
      "${completion.sub}"
    </p>

    <p class="celebration__message anim-fade-up"
       style="font-size:var(--text-sm);color:var(--clr-text-hero-muted);animation-delay:400ms">
      Completed in ${timeMsg}
    </p>

    <div class="celebration__crisis" id="celebration-crisis"></div>
  `

  // Crisis resources (always shown at completion as a gentle reminder)
  if (crisisResources?.length) {
    el.querySelector('#celebration-crisis').appendChild(
      renderCrisisCard(crisisResources)
    )
  }

  // Confetti burst (respects reduced-motion)
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    _burstConfetti()
  }

  return el
}

function _burstConfetti () {
  const colours = ['#3D7A5C', '#4A7FC1', '#E07B54', '#7B6FA0', '#F0A882', '#8EC9A8']
  const shapes  = ['■', '●', '▲', '◆']
  const COUNT   = 48

  for (let i = 0; i < COUNT; i++) {
    setTimeout(() => {
      const el = document.createElement('span')
      el.className = 'confetti-particle'
      el.textContent = shapes[Math.floor(Math.random() * shapes.length)]
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: ${30 + Math.random() * 30}vh;
        color: ${colours[Math.floor(Math.random() * colours.length)]};
        font-size: ${8 + Math.random() * 10}px;
        animation-duration: ${0.8 + Math.random() * 0.8}s;
        animation-delay: 0ms;
      `
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 1600)
    }, Math.random() * 600)
  }
}
