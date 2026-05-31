/**
 * Question Types — renders all question variants + navigation
 *
 * Supported: single-choice · rating · number · pin-location · story · consent
 *
 * Each renderer returns a self-contained HTMLElement. The engine
 * provides callbacks; this module never touches engine state directly.
 */

import pinsData from '../data/pins.json'
import { renderCrisisCard } from './crisis.js'

/**
 * Render a complete question card (label + input + nav).
 * @param {Object} opts
 * @param {Object}    opts.question        - Question config
 * @param {*}         opts.savedAnswer     - Previously saved value (or null)
 * @param {boolean}   opts.showCrisis      - Whether to show crisis resources
 * @param {Array}     opts.crisisResources - Crisis resource list
 * @param {Function}  opts.onAnswer        - Called with (value) when answered
 * @param {Function}  opts.onNext          - Called when Next is pressed
 * @param {Function}  opts.onBack          - Called when Back is pressed
 * @param {Function}  opts.onSkip          - Called when Skip is pressed
 * @returns {HTMLElement}
 */
export function renderQuestionCard ({
  question,
  savedAnswer,
  showCrisis,
  crisisResources,
  onAnswer,
  onNext,
  onBack,
  onSkip
}) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:var(--sp-4);width:100%;'

  // ── Card
  const card = document.createElement('div')
  card.className = 'question-card anim-scale-in'
  card.setAttribute('role', 'group')
  card.setAttribute('aria-labelledby', `ql-${question.id}`)

  // Header
  const header = document.createElement('div')
  header.className = 'question-card__header'
  header.innerHTML = `
    <label id="ql-${question.id}" class="question-card__label" for="qi-${question.id}">
      ${question.label}
      ${question.required ? '<span class="question-card__required" aria-label="required">*</span>' : ''}
    </label>
    ${question.hint ? `<p class="question-card__hint" id="qh-${question.id}">${question.hint}</p>` : ''}
  `
  card.appendChild(header)

  // ── Input area
  let getCurrentValue
  let inputEl

  switch (question.type) {
    case 'single-choice': {
      const { el, getValue } = _renderSingleChoice(question, savedAnswer, onAnswer)
      inputEl = el; getCurrentValue = getValue; break
    }
    case 'rating': {
      const { el, getValue } = _renderRating(question, savedAnswer, onAnswer)
      inputEl = el; getCurrentValue = getValue; break
    }
    case 'number': {
      const { el, getValue } = _renderNumber(question, savedAnswer)
      inputEl = el; getCurrentValue = getValue; break
    }
    case 'pin-location': {
      const { el, getValue } = _renderPinLocation(question, savedAnswer, onAnswer)
      inputEl = el; getCurrentValue = getValue; break
    }
    case 'birth-date': {
      const { el, getValue } = _renderBirthDate(question, savedAnswer)
      inputEl = el; getCurrentValue = getValue; break
    }
    case 'story': {
      const { el, getValue } = _renderStory(question, savedAnswer)
      inputEl = el; getCurrentValue = getValue; break
    }
    case 'consent': {
      const { el, getValue } = _renderConsent(question, savedAnswer, onAnswer)
      inputEl = el; getCurrentValue = getValue; break
    }
    default: {
      const { el, getValue } = _renderNumber(question, savedAnswer)
      inputEl = el; getCurrentValue = getValue
    }
  }

  card.appendChild(inputEl)

  // ── Validation error placeholder
  const errorEl = document.createElement('div')
  errorEl.id = `qe-${question.id}`
  errorEl.setAttribute('role', 'alert')
  errorEl.setAttribute('aria-live', 'polite')
  card.appendChild(errorEl)

  wrap.appendChild(card)

  // ── Crisis card (below question card when distress ≥ threshold)
  if (showCrisis && crisisResources?.length) {
    wrap.appendChild(renderCrisisCard(crisisResources))
  }

  // ── Navigation row
  const nav = _renderNav({
    question,
    onBack,
    onSkip,
    onNext: () => {
      const value = getCurrentValue()
      const err = _validate(question, value)
      if (err) {
        _showError(errorEl, err)
        return
      }
      _clearError(errorEl)
      if (value !== null && value !== undefined && value !== '') {
        onAnswer(value)
      }
      onNext()
    }
  })
  wrap.appendChild(nav)

  return wrap
}

// ─── SINGLE CHOICE ────────────────────────────────────────────────────────────

function _renderSingleChoice (question, savedAnswer, onAnswer) {
  const el = document.createElement('ul')
  el.className = 'choice-list'
  el.setAttribute('role', 'radiogroup')
  el.setAttribute('aria-labelledby', `ql-${question.id}`)
  if (question.hint) el.setAttribute('aria-describedby', `qh-${question.id}`)

  let current = savedAnswer

  question.options.forEach(opt => {
    const li = document.createElement('li')
    li.className = 'choice-item'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `choice-btn${current === opt.value ? ' is-selected' : ''}`
    btn.setAttribute('role', 'radio')
    btn.setAttribute('aria-checked', String(current === opt.value))
    btn.setAttribute('data-value', opt.value)
    btn.innerHTML = `
      <span class="choice-btn__indicator" aria-hidden="true"></span>
      <span class="choice-btn__label">${opt.label}</span>
    `

    btn.addEventListener('click', () => {
      // Deselect all
      el.querySelectorAll('.choice-btn').forEach(b => {
        b.classList.remove('is-selected')
        b.setAttribute('aria-checked', 'false')
      })
      // Select this
      btn.classList.add('is-selected')
      btn.setAttribute('aria-checked', 'true')
      current = opt.value
      onAnswer(opt.value)
    })

    li.appendChild(btn)
    el.appendChild(li)
  })

  return { el, getValue: () => current }
}

// ─── RATING ───────────────────────────────────────────────────────────────────

function _renderRating (question, savedAnswer, onAnswer) {
  const el = document.createElement('div')
  el.className = 'rating-scale'
  el.setAttribute('role', 'group')
  el.setAttribute('aria-labelledby', `ql-${question.id}`)

  const track = document.createElement('div')
  track.className = 'rating-scale__track'

  let current = savedAnswer ? Number(savedAnswer) : null

  for (let i = question.min; i <= question.max; i++) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `rating-btn${current === i ? ' is-selected' : ''}`
    btn.setAttribute('data-value', i)
    btn.setAttribute('aria-label', `${i} — ${_ratingLabel(i, question)}`)
    btn.setAttribute('aria-pressed', String(current === i))
    btn.textContent = i

    btn.addEventListener('click', () => {
      track.querySelectorAll('.rating-btn').forEach(b => {
        b.classList.remove('is-selected')
        b.setAttribute('aria-pressed', 'false')
      })
      btn.classList.add('is-selected')
      btn.setAttribute('aria-pressed', 'true')
      current = i
      onAnswer(i)
    })

    track.appendChild(btn)
  }

  const labels = document.createElement('div')
  labels.className = 'rating-scale__labels'
  labels.setAttribute('aria-hidden', 'true')
  labels.innerHTML = `
    <span>${question.labelLow || 'Low'}</span>
    <span>${question.labelHigh || 'High'}</span>
  `

  el.appendChild(track)
  el.appendChild(labels)

  return { el, getValue: () => current }
}

function _ratingLabel (val, question) {
  if (val <= 3)  return question.labelLow  || 'Low'
  if (val >= 8)  return question.labelHigh || 'High'
  return 'Moderate'
}

// ─── BIRTH DATE ───────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function _renderBirthDate (question, savedAnswer) {
  const el = document.createElement('div')
  el.className = 'birth-date-wrap'

  // ── Month + Year row
  const fieldsRow = document.createElement('div')
  fieldsRow.className = 'birth-date-fields'

  // Month select
  const monthWrap = document.createElement('div')
  monthWrap.className = 'birth-date-field'
  const monthLabel = document.createElement('label')
  monthLabel.className = 'birth-date-field__label'
  monthLabel.textContent = 'Month'
  monthLabel.setAttribute('for', `${question.id}-month`)
  const monthSel = document.createElement('select')
  monthSel.id = `${question.id}-month`
  monthSel.className = 'birth-date-select'
  monthSel.setAttribute('aria-label', 'Birth month')
  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = 'Select month'
  placeholder.disabled = true
  placeholder.selected = true
  monthSel.appendChild(placeholder)
  MONTHS.forEach((name, idx) => {
    const opt = document.createElement('option')
    opt.value = idx + 1
    opt.textContent = name
    monthSel.appendChild(opt)
  })

  // Year input
  const yearWrap = document.createElement('div')
  yearWrap.className = 'birth-date-field'
  const yearLabel = document.createElement('label')
  yearLabel.className = 'birth-date-field__label'
  yearLabel.textContent = 'Year'
  yearLabel.setAttribute('for', `${question.id}-year`)
  const yearInput = document.createElement('input')
  yearInput.type = 'number'
  yearInput.id = `${question.id}-year`
  yearInput.className = 'birth-year-input'
  yearInput.placeholder = 'e.g. 1985'
  yearInput.min = 1920
  yearInput.max = new Date().getFullYear() - 10
  yearInput.inputMode = 'numeric'
  yearInput.pattern = '[0-9]{4}'
  if (question.hint) yearInput.setAttribute('aria-describedby', `qh-${question.id}`)

  // Restore saved state
  let savedMonth = null
  let savedYear  = null
  if (savedAnswer && typeof savedAnswer === 'object') {
    savedMonth = savedAnswer.month
    savedYear  = savedAnswer.year
    if (savedMonth) monthSel.value = savedMonth
    if (savedYear)  yearInput.value = savedYear
  }

  // ── Days on planet display
  const daysEl = document.createElement('div')
  daysEl.className = 'days-on-planet'
  daysEl.setAttribute('aria-live', 'polite')
  daysEl.setAttribute('aria-atomic', 'true')
  if (savedMonth && savedYear) _updateDays(savedMonth, savedYear, daysEl)

  function _updateDays (month, year, target) {
    if (!month || !year || year < 1920 || year > new Date().getFullYear()) {
      target.innerHTML = ''
      return
    }
    const birth = new Date(year, month - 1, 15) // approximate mid-month
    const today = new Date()
    if (birth > today) { target.innerHTML = ''; return }
    const days = Math.floor((today - birth) / 86400000)
    const years = Math.floor(days / 365.25)
    target.innerHTML = `
      <div class="days-on-planet__inner">
        <span class="days-on-planet__emoji" aria-hidden="true">🌍</span>
        <div>
          <strong class="days-on-planet__count">${days.toLocaleString()}</strong>
          <span class="days-on-planet__label"> days on this planet</span>
          <span class="days-on-planet__years">&nbsp;·&nbsp;${years} years of lived experience</span>
        </div>
      </div>
    `
  }

  const onFieldChange = () => {
    const m = monthSel.value ? Number(monthSel.value) : null
    const y = yearInput.value.length === 4 ? Number(yearInput.value) : null
    if (m) savedMonth = m
    if (y) savedYear  = y
    _updateDays(savedMonth, savedYear, daysEl)
  }

  monthSel.addEventListener('change', onFieldChange)
  yearInput.addEventListener('input', onFieldChange)

  monthWrap.appendChild(monthLabel)
  monthWrap.appendChild(monthSel)
  yearWrap.appendChild(yearLabel)
  yearWrap.appendChild(yearInput)
  fieldsRow.appendChild(monthWrap)
  fieldsRow.appendChild(yearWrap)
  el.appendChild(fieldsRow)
  el.appendChild(daysEl)

  return {
    el,
    getValue: () => {
      const m = monthSel.value ? Number(monthSel.value) : null
      const y = yearInput.value.length === 4 ? Number(yearInput.value) : null
      if (!m && !y) return null
      return { month: m, year: y, monthName: m ? MONTHS[m - 1] : null }
    }
  }
}

// ─── NUMBER ───────────────────────────────────────────────────────────────────

function _renderNumber (question, savedAnswer) {
  const el = document.createElement('div')

  const input = document.createElement('input')
  input.type        = 'number'
  input.id          = `qi-${question.id}`
  input.className   = 'text-input'
  input.placeholder = question.placeholder || ''
  input.value       = savedAnswer ?? ''
  if (question.validation?.min !== undefined) input.min = question.validation.min
  if (question.validation?.max !== undefined) input.max = question.validation.max
  if (question.hint) input.setAttribute('aria-describedby', `qh-${question.id}`)
  if (question.required) input.required = true
  input.inputMode = 'numeric'
  input.pattern  = '[0-9]*'

  el.appendChild(input)
  return { el, getValue: () => input.value === '' ? '' : Number(input.value) }
}

// ─── PIN LOCATION ─────────────────────────────────────────────────────────────

function _renderPinLocation (question, savedAnswer, onAnswer) {
  const el   = document.createElement('div')
  el.className = 'pin-location'

  const input = document.createElement('input')
  input.type        = 'text'
  input.id          = `qi-${question.id}`
  input.className   = 'text-input'
  input.placeholder = question.placeholder || '6-digit PIN code'
  input.maxLength   = 6
  input.inputMode   = 'numeric'
  input.pattern     = '[0-9]{6}'
  if (question.hint) input.setAttribute('aria-describedby', `qh-${question.id}`)

  // Auto-fill row
  const autofillWrap = document.createElement('div')
  autofillWrap.className = 'pin-autofill'
  autofillWrap.setAttribute('aria-live', 'polite')
  autofillWrap.innerHTML = `
    <div style="flex:1">
      <p class="pin-autofill__label">City</p>
      <div class="pin-autofill__field" id="pin-city" aria-label="City auto-filled from PIN">—</div>
    </div>
    <div style="flex:1">
      <p class="pin-autofill__label">State</p>
      <div class="pin-autofill__field" id="pin-state" aria-label="State auto-filled from PIN">—</div>
    </div>
  `

  let savedPin   = savedAnswer?.pin   || ''
  let savedCity  = savedAnswer?.city  || ''
  let savedState = savedAnswer?.state || ''

  if (savedPin) {
    input.value = savedPin
    autofillWrap.querySelector('#pin-city').textContent  = savedCity  || '—'
    autofillWrap.querySelector('#pin-state').textContent = savedState || '—'
  }

  input.addEventListener('input', () => {
    const raw = input.value.replace(/\D/g, '').slice(0, 6)
    input.value = raw
    const lookup = pinsData[raw]
    const cityEl  = autofillWrap.querySelector('#pin-city')
    const stateEl = autofillWrap.querySelector('#pin-state')
    if (lookup) {
      cityEl.textContent  = lookup.city
      stateEl.textContent = lookup.state
      savedCity  = lookup.city
      savedState = lookup.state
    } else if (raw.length === 6) {
      cityEl.textContent  = 'Enter city manually'
      stateEl.textContent = '—'
    } else {
      cityEl.textContent  = '—'
      stateEl.textContent = '—'
    }
    savedPin = raw
    onAnswer({ pin: raw, city: savedCity, state: savedState })
  })

  el.appendChild(input)
  el.appendChild(autofillWrap)

  return {
    el,
    getValue: () => savedPin ? { pin: savedPin, city: savedCity, state: savedState } : null
  }
}

// ─── STORY ────────────────────────────────────────────────────────────────────

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

function _renderStory (question, savedAnswer) {
  const el = document.createElement('div')
  el.style.cssText = 'display:flex;flex-direction:column;gap:var(--sp-2);'

  // ── STT toolbar (mic button + status)
  const sttBar = document.createElement('div')
  sttBar.className = 'stt-bar'

  const micBtn = document.createElement('button')
  micBtn.type = 'button'
  micBtn.className = 'stt-mic-btn'
  micBtn.setAttribute('aria-label', 'Start voice input')
  micBtn.innerHTML = `
    <svg class="stt-mic-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
      <path d="M5 10a7 7 0 0014 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span class="stt-mic-label">Speak your story</span>
  `

  const sttStatus = document.createElement('div')
  sttStatus.className = 'stt-status'
  sttStatus.setAttribute('aria-live', 'polite')
  sttStatus.setAttribute('aria-atomic', 'true')

  const sttHint = document.createElement('p')
  sttHint.className = 'stt-hint'
  if (!SpeechRecognition) {
    sttHint.textContent = 'Voice input requires Chrome or Edge.'
    micBtn.disabled = true
    micBtn.classList.add('stt-mic-btn--disabled')
  } else {
    sttHint.textContent = 'Tap the mic to speak — your words will appear in the text box.'
  }

  sttBar.appendChild(micBtn)
  sttBar.appendChild(sttStatus)
  el.appendChild(sttBar)
  el.appendChild(sttHint)

  // ── Textarea
  const textarea = document.createElement('textarea')
  textarea.id          = `qi-${question.id}`
  textarea.className   = 'story-area'
  textarea.placeholder = question.placeholder || 'Your story begins here…'
  textarea.rows        = 8
  textarea.value       = savedAnswer || ''
  if (question.hint) textarea.setAttribute('aria-describedby', `qh-${question.id}`)
  textarea.setAttribute('aria-multiline', 'true')

  const wordcount = document.createElement('p')
  wordcount.className = 'story-wordcount'
  wordcount.setAttribute('aria-live', 'polite')
  wordcount.setAttribute('aria-atomic', 'true')

  const updateCount = () => {
    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length
    wordcount.textContent = words > 0 ? `${words} word${words === 1 ? '' : 's'}` : ''
  }
  updateCount()
  textarea.addEventListener('input', updateCount)

  el.appendChild(textarea)
  el.appendChild(wordcount)

  // ── Web Speech API wiring
  if (SpeechRecognition) {
    let recognition = null
    let isListening = false
    let interimSpan = null

    const setListening = (active) => {
      isListening = active
      micBtn.classList.toggle('stt-mic-btn--active', active)
      micBtn.setAttribute('aria-label', active ? 'Stop voice input' : 'Start voice input')
      micBtn.querySelector('.stt-mic-label').textContent = active ? 'Stop listening' : 'Speak your story'
      sttStatus.innerHTML = active
        ? `<span class="stt-listening-badge">
             <span class="stt-pulse" aria-hidden="true"></span>Listening…
           </span>`
        : ''
    }

    micBtn.addEventListener('click', () => {
      if (isListening) {
        recognition?.stop()
        return
      }

      recognition = new SpeechRecognition()
      recognition.lang       = 'en-IN'  // Indian English
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => setListening(true)

      recognition.onresult = (e) => {
        let interim = ''
        let final   = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) final += t + ' '
          else interim += t
        }
        if (final) {
          // Append confirmed text to textarea
          textarea.value += final
          updateCount()
          // Remove any interim indicator
          if (interimSpan) { interimSpan.remove(); interimSpan = null }
        }
        // Show interim as a floating preview in status
        if (interim) {
          sttStatus.innerHTML = `
            <span class="stt-listening-badge">
              <span class="stt-pulse" aria-hidden="true"></span>Listening…
            </span>
            <span class="stt-interim">${interim}</span>`
        }
      }

      recognition.onerror = (e) => {
        setListening(false)
        const msgs = {
          'not-allowed': 'Microphone permission denied. Please allow microphone access.',
          'no-speech':   'No speech detected — tap the mic and try again.',
          'network':     'Network error. Check your connection and try again.'
        }
        sttStatus.innerHTML = `<span class="stt-error">${msgs[e.error] || 'Voice input error — please try again.'}</span>`
      }

      recognition.onend = () => setListening(false)

      recognition.start()
    })
  }

  return { el, getValue: () => textarea.value.trim() }
}

// ─── CONSENT ──────────────────────────────────────────────────────────────────

function _renderConsent (question, savedAnswer, onAnswer) {
  const el = document.createElement('div')
  el.className = 'consent-block'

  const desc = document.createElement('div')
  desc.className = 'consent-description'
  desc.innerHTML = `<p>${question.description}</p>`
  el.appendChild(desc)

  const btns = document.createElement('div')
  btns.className = 'consent-btns'
  btns.setAttribute('role', 'group')
  btns.setAttribute('aria-labelledby', `ql-${question.id}`)

  let current = savedAnswer || null

  const yesBtn = document.createElement('button')
  yesBtn.type = 'button'
  yesBtn.className = `consent-btn consent-btn--yes${current === 'yes' ? ' is-selected' : ''}`
  yesBtn.setAttribute('aria-pressed', String(current === 'yes'))
  yesBtn.textContent = question.confirmLabel || 'Yes, I consent'

  const noBtn = document.createElement('button')
  noBtn.type = 'button'
  noBtn.className = `consent-btn consent-btn--no${current === 'no' ? ' is-selected' : ''}`
  noBtn.setAttribute('aria-pressed', String(current === 'no'))
  noBtn.textContent = question.denyLabel || 'No'

  const toggle = (val) => {
    current = val
    yesBtn.classList.toggle('is-selected', val === 'yes')
    noBtn.classList.toggle('is-selected',  val === 'no')
    yesBtn.setAttribute('aria-pressed', String(val === 'yes'))
    noBtn.setAttribute('aria-pressed',  String(val === 'no'))
    onAnswer(val)
  }

  yesBtn.addEventListener('click', () => toggle('yes'))
  noBtn.addEventListener('click',  () => toggle('no'))

  btns.appendChild(yesBtn)
  btns.appendChild(noBtn)
  el.appendChild(btns)

  return { el, getValue: () => current }
}

// ─── NAVIGATION ROW ───────────────────────────────────────────────────────────

function _renderNav ({ question, onBack, onSkip, onNext }) {
  const nav = document.createElement('div')
  nav.className = 'question-nav'

  // Back
  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'question-nav__back btn--text'
  backBtn.setAttribute('aria-label', 'Go back to previous question')
  backBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Back`
  backBtn.addEventListener('click', onBack)

  // Skip (only if not required)
  if (!question.required) {
    const skipBtn = document.createElement('button')
    skipBtn.type = 'button'
    skipBtn.className = 'question-nav__skip btn--text'
    skipBtn.setAttribute('aria-label', 'Skip this question')
    skipBtn.textContent = 'Skip'
    skipBtn.addEventListener('click', onSkip)
    nav.appendChild(backBtn)
    nav.appendChild(skipBtn)
  } else {
    nav.appendChild(backBtn)
  }

  // Next (shown for non-auto-advance types)
  const autoAdvanceTypes = ['single-choice']
  if (!autoAdvanceTypes.includes(question.type)) {
    const nextBtn = document.createElement('button')
    nextBtn.type = 'button'
    nextBtn.className = 'btn btn--primary question-nav__next'
    nextBtn.setAttribute('aria-label', 'Continue to next question')
    nextBtn.innerHTML = `Continue
      <svg class="btn__icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    nextBtn.addEventListener('click', onNext)
    nav.appendChild(nextBtn)
  }

  return nav
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

function _validate (question, value) {
  if (question.type === 'birth-date') {
    if (question.required && (!value || (!value.month && !value.year))) {
      return 'Please select your birth month and enter your birth year.'
    }
    if (value && value.year && (value.year < 1920 || value.year > new Date().getFullYear() - 10)) {
      return `Please enter a valid birth year between 1920 and ${new Date().getFullYear() - 10}.`
    }
    if (value && value.month && !value.year) return 'Please enter your birth year.'
    if (value && value.year && !value.month) return 'Please select your birth month.'
    return null
  }

  if (question.required && (value === null || value === undefined || value === '')) {
    return 'This question is required — please provide an answer before continuing.'
  }

  if (question.type === 'number' && value !== '' && value !== null) {
    const n = Number(value)
    if (isNaN(n)) return 'Please enter a valid number.'
    if (question.validation?.min !== undefined && n < question.validation.min) {
      return question.validation.errorMin || `Minimum value is ${question.validation.min}.`
    }
    if (question.validation?.max !== undefined && n > question.validation.max) {
      return question.validation.errorMax || `Maximum value is ${question.validation.max}.`
    }
  }

  return null // valid
}

function _showError (el, msg) {
  el.innerHTML = `<div class="field-error" role="alert">
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4v4m0 4h.01" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"/>
    </svg>
    ${msg}
  </div>`
}

function _clearError (el) {
  el.innerHTML = ''
}
