/**
 * Crisis Resources card
 * Shown when distress rating ≥ threshold.
 */

/**
 * @param {Array} resources - crisisResources from survey.json
 * @returns {HTMLElement}
 */
export function renderCrisisCard (resources) {
  const el = document.createElement('div')
  el.className = 'crisis-card anim-fade-up'
  el.setAttribute('role', 'complementary')
  el.setAttribute('aria-label', 'Mental health support resources')

  const list = resources.map(r => `
    <li class="crisis-list__item">
      <span>
        <span class="crisis-list__name">${r.name}</span>
        <span class="crisis-list__desc">&nbsp;·&nbsp;${r.desc}</span>
      </span>
      <a href="tel:${r.number.replace(/[^0-9+]/g, '')}"
         class="crisis-list__number"
         aria-label="Call ${r.name} at ${r.number}">
        ${r.number}
      </a>
    </li>
  `).join('')

  el.innerHTML = `
    <p class="crisis-card__heading">💛 Support is available</p>
    <p class="crisis-card__body">
      If you're finding things difficult right now, please know you don't have to face this alone.
      Reaching out is a sign of strength, not weakness.
    </p>
    <ul class="crisis-list" aria-label="Helplines">
      ${list}
    </ul>
  `

  return el
}
