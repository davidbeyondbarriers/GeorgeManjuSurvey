/**
 * Navigation — manages screen-level transitions
 *
 * Handles moving between hero → motivation → survey stages,
 * and the enter/exit animation classes on the survey stage.
 */

const ENTER_CLASS_FWD  = 'stage-enter-right'
const ENTER_CLASS_BACK = 'stage-enter-left'
const EXIT_CLASS_FWD   = 'stage-exit-left'
const EXIT_CLASS_BACK  = 'stage-exit-right'

/**
 * Transition the survey stage to a new card element.
 * @param {HTMLElement} stage     - The .survey__stage container
 * @param {HTMLElement} newCard   - The new card to show
 * @param {'forward'|'back'} dir - Direction of navigation
 * @returns {Promise<void>}       - Resolves when the transition completes
 */
export function transitionCard (stage, newCard, dir = 'forward') {
  return new Promise(resolve => {
    const exitClass  = dir === 'forward' ? EXIT_CLASS_FWD  : EXIT_CLASS_BACK
    const enterClass = dir === 'forward' ? ENTER_CLASS_FWD : ENTER_CLASS_BACK
    const duration   = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--dur-base')
        .trim()
        .replace('ms', '')
    ) || 280

    const existing = stage.querySelectorAll(':scope > *')

    // Exit existing cards
    existing.forEach(el => {
      el.classList.add(exitClass)
    })

    // Wait for exit, then swap
    setTimeout(() => {
      stage.innerHTML = ''
      newCard.classList.add(enterClass)
      stage.appendChild(newCard)

      // Remove animation class after it plays so it doesn't interfere later
      requestAnimationFrame(() => {
        setTimeout(() => {
          newCard.classList.remove(enterClass)
          resolve()
        }, 600)
      })
    }, duration)
  })
}

/**
 * Show a section by removing its [hidden] attribute with a fade.
 * @param {HTMLElement} el
 */
export function showSection (el) {
  el.removeAttribute('hidden')
  el.style.opacity = '0'
  requestAnimationFrame(() => {
    el.style.transition = `opacity ${getComputedStyle(document.documentElement).getPropertyValue('--dur-slow').trim()} ${getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim()}`
    el.style.opacity = '1'
  })
}

/**
 * Hide a section with a fade-out.
 * @param {HTMLElement} el
 * @returns {Promise<void>}
 */
export function hideSection (el) {
  return new Promise(resolve => {
    const dur = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--dur-base').trim().replace('ms', '')
    ) || 280
    el.style.transition = `opacity ${dur}ms ease`
    el.style.opacity = '0'
    setTimeout(() => {
      el.setAttribute('hidden', '')
      el.style.opacity = ''
      el.style.transition = ''
      resolve()
    }, dur)
  })
}

/**
 * Scroll the window smoothly to the top.
 */
export function scrollToTop () {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * Announce a message to screen readers via the live region.
 * @param {string} message
 */
export function announce (message) {
  const el = document.getElementById('aria-live')
  if (!el) return
  el.textContent = ''
  requestAnimationFrame(() => { el.textContent = message })
}
