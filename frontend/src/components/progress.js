/**
 * Progress HUD — shown above each question card
 *
 * Displays: chapter name · chapter milestone dots · completion % · time estimate
 */

/**
 * @param {Object} opts
 * @param {Object}   opts.chapter             - Current chapter config
 * @param {number}   opts.chapterIndex        - 0-based
 * @param {number}   opts.chapterCount        - Total chapters
 * @param {string[]} opts.completedChapterIds - IDs of chapters already done
 * @param {number}   opts.pct                 - 0–100 overall completion
 * @returns {HTMLElement}
 */
export function renderProgressHUD ({
  chapter,
  chapterIndex,
  chapterCount,
  completedChapterIds,
  pct
}) {
  const el = document.createElement('div')
  el.className = 'progress-hud'
  el.setAttribute('aria-label', `Survey progress: ${pct}% complete, chapter ${chapterIndex + 1} of ${chapterCount}`)

  // Chapter dots
  const dots = Array.from({ length: chapterCount }, (_, i) => {
    const isDone   = completedChapterIds.includes(_chapterIdForIndex(i, chapterCount))
    const isActive = i === chapterIndex
    return `<span class="chapter-dot${isActive ? ' is-active' : isDone ? ' is-done' : ''}"
                  aria-hidden="true"></span>`
  }).join('')

  el.innerHTML = `
    <span class="progress-hud__chapter">${chapter.title}</span>
    <div class="chapter-dots" role="presentation">${dots}</div>
    <span class="progress-hud__pct" aria-hidden="true">${pct}%</span>
  `

  return el
}

function _chapterIdForIndex (i, total) {
  // Chapters follow the survey.json order; we use the index as a proxy
  // (the engine passes completedChapterIds by ID, so this just needs to be consistent)
  return `ch-index-${i}`
}
