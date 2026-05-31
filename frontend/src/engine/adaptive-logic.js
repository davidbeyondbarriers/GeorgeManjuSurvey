/**
 * Adaptive Logic — skip logic, branching, conditional reveals
 *
 * All rules live in survey.json (question.showIf).
 * This module evaluates them against the current response map.
 */

/**
 * Decide whether a question should be shown given current responses.
 * @param {Object} question   - Question config from survey.json
 * @param {Object} responses  - { [questionId]: value }
 * @returns {boolean}
 */
export function shouldShow (question, responses) {
  if (!question.showIf) return true

  const { questionId, values } = question.showIf
  const response = responses[questionId]

  if (response === undefined || response === null || response === '') return false

  // For arrays (multi-choice), check if any selected value is in `values`
  if (Array.isArray(response)) {
    return response.some(v => values.includes(v))
  }

  return values.includes(response)
}

/**
 * Build the ordered list of question IDs that should be shown
 * for a given chapter, based on current responses.
 * @param {Array}  questions  - Chapter's questions array
 * @param {Object} responses  - Current response map
 * @returns {string[]}        - Ordered visible question IDs
 */
export function visibleQuestions (questions, responses) {
  return questions
    .filter(q => shouldShow(q, responses))
    .map(q => q.id)
}

/**
 * Get the next question ID to navigate to.
 * Skips hidden questions automatically.
 * @param {string} currentId   - Current question ID
 * @param {Array}  allQuestions - Flat array of ALL questions across all chapters
 * @param {Object} responses   - Current response map
 * @returns {string|null}      - Next visible question ID, or null if at end
 */
export function getNextQuestion (currentId, allQuestions, responses) {
  const idx = allQuestions.findIndex(q => q.id === currentId)
  if (idx === -1) return null

  for (let i = idx + 1; i < allQuestions.length; i++) {
    if (shouldShow(allQuestions[i], responses)) {
      return allQuestions[i].id
    }
  }
  return null // reached the end
}

/**
 * Get the previous visible question ID.
 * @param {string} currentId
 * @param {Array}  allQuestions
 * @param {Object} responses
 * @returns {string|null}
 */
export function getPrevQuestion (currentId, allQuestions, responses) {
  const idx = allQuestions.findIndex(q => q.id === currentId)
  if (idx <= 0) return null

  for (let i = idx - 1; i >= 0; i--) {
    if (shouldShow(allQuestions[i], responses)) {
      return allQuestions[i].id
    }
  }
  return null
}

/**
 * Calculate overall survey completion percentage.
 * Counts answered visible questions / total visible questions.
 * @param {Array}  allQuestions
 * @param {Object} responses
 * @returns {number} 0–100
 */
export function calcProgress (allQuestions, responses) {
  const visible = allQuestions.filter(q => shouldShow(q, responses))
  if (visible.length === 0) return 0

  const answered = visible.filter(q => {
    const v = responses[q.id]
    return v !== undefined && v !== null && v !== ''
  })

  return Math.round((answered.length / visible.length) * 100)
}

/**
 * Find which chapter a question belongs to.
 * @param {string} questionId
 * @param {Array}  chapters
 * @returns {Object|null}
 */
export function chapterForQuestion (questionId, chapters) {
  for (const ch of chapters) {
    if (ch.questions.some(q => q.id === questionId)) return ch
  }
  return null
}

/**
 * Check whether all required questions in a chapter are answered.
 * @param {Object} chapter
 * @param {Object} responses
 * @returns {boolean}
 */
export function chapterComplete (chapter, responses) {
  return chapter.questions
    .filter(q => q.required && shouldShow(q, responses))
    .every(q => {
      const v = responses[q.id]
      return v !== undefined && v !== null && v !== ''
    })
}

/**
 * Should the crisis resources card be shown?
 * @param {Object} responses
 * @param {Array}  allQuestions
 * @returns {boolean}
 */
export function shouldShowCrisis (responses, allQuestions) {
  const distressQ = allQuestions.find(q => q.crisisThreshold !== undefined)
  if (!distressQ) return false
  const val = Number(responses[distressQ.id])
  return !isNaN(val) && val >= distressQ.crisisThreshold
}
