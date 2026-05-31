/**
 * Chapter Intro Card — milestone marker between chapters
 *
 * Shows the chapter icon, title, guide message, and a Begin button.
 */

/**
 * Render a chapter intro card.
 * @param {Object} opts
 * @param {Object}   opts.chapter        - Chapter config from survey.json
 * @param {number}   opts.chapterIndex   - 0-based chapter index
 * @param {number}   opts.chapterCount   - Total chapters
 * @param {Function} opts.onBegin        - Called when user clicks Begin
 * @returns {HTMLElement}
 */
export function renderChapterIntro ({ chapter, chapterIndex, chapterCount, onBegin }) {
  const el = document.createElement('div')
  el.className = 'chapter-intro anim-fade-up'
  el.setAttribute('role', 'region')
  el.setAttribute('aria-labelledby', `ch-intro-title-${chapter.id}`)

  el.innerHTML = `
    <span class="chapter-intro__chapter-badge" aria-label="Chapter ${chapterIndex + 1} of ${chapterCount}">
      Chapter ${chapterIndex + 1} of ${chapterCount}
    </span>

    <div class="chapter-intro__icon" aria-hidden="true">${chapter.icon}</div>

    <h2 id="ch-intro-title-${chapter.id}" class="chapter-intro__title">
      ${chapter.title}
    </h2>

    <div class="chapter-intro__guide-message">
      <div class="guide-message" role="note" aria-label="Message from ${_guideLabel(chapter.intro.guide)}">
        <div class="guide-message__avatar" aria-hidden="true">
          <img src="/assets/george-manju.png"
               alt="${_guideLabel(chapter.intro.guide)}"
               loading="lazy" />
        </div>
        <div class="guide-message__content">
          <p class="guide-message__name">${_guideLabel(chapter.intro.guide)}</p>
          <p class="guide-message__text">${chapter.intro.text}</p>
        </div>
      </div>
    </div>

    <p class="motivation__body" style="font-size:var(--text-sm);color:var(--clr-text-muted)">
      ~${chapter.estimatedMinutes} min
    </p>

    <div class="chapter-intro__cta">
      <button class="btn btn--primary btn--lg js-begin-chapter" type="button"
              aria-label="Begin ${chapter.title} chapter">
        Begin
        <svg class="btn__icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `

  el.querySelector('.js-begin-chapter').addEventListener('click', onBegin, { once: true })

  return el
}

function _guideLabel (guide) {
  if (guide === 'george') return 'George'
  if (guide === 'manju')  return 'Manju'
  return 'George & Manju'
}
