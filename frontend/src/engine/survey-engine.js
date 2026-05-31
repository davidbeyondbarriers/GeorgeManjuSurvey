/**
 * Survey Engine — core render + state machine
 *
 * Orchestrates chapters, questions, adaptive routing, progress updates,
 * autosave, and analytics. Components are pure renderers; all state lives here.
 */

import { track }           from '../analytics/track.js'
import { saveState, saveResponse, updateProgress, completeSession } from '../persistence/autosave.js'
import { transitionCard, announce, scrollToTop } from './navigation.js'
import {
  getNextQuestion,
  getPrevQuestion,
  calcProgress,
  chapterForQuestion,
  shouldShowCrisis
} from './adaptive-logic.js'
import { renderChapterIntro }   from '../components/chapter-intro.js'
import { renderQuestionCard }   from '../components/question-types.js'
import { renderProgressHUD }    from '../components/progress.js'
import { renderCelebration }    from '../components/celebration.js'

/** @type {Object} Internal engine state */
let _state = {
  chapterId:    null,
  questionId:   null,
  responses:    {},
  history:      [],    // stack of visited question IDs for back navigation
  startTime:    null,
  complete:     false
}

/** Flat ordered list of ALL questions, built at init */
let _allQuestions = []
/** Chapter configs */
let _chapters = []
/** Survey config */
let _surveyData = null
/** DOM stage element */
let _stage = null
/** Progress bar fill element */
let _progressFill = null
/** Progress bar ARIA element */
let _progressBar = null
/** Completion callback */
let _onComplete = null

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialise the survey engine.
 * @param {Object} opts
 * @param {Object}   opts.data       - Parsed survey.json
 * @param {HTMLElement} opts.stage   - .survey__stage element
 * @param {Object|null} opts.savedState - Previously persisted state
 * @param {Function} opts.onComplete - Callback when survey is submitted
 */
export function initSurvey ({ data, stage, savedState, onComplete }) {
  _surveyData    = data
  _stage         = stage
  _onComplete    = onComplete
  _progressFill  = document.getElementById('progress-fill')
  _progressBar   = document.getElementById('progress-bar')

  // Build flat question list
  _chapters = data.chapters
  _allQuestions = _chapters.flatMap(ch => ch.questions)

  // Restore or initialise state
  if (savedState && !savedState.complete) {
    _state = {
      ..._state,
      ...savedState,
      complete: false
    }
  } else {
    _state.startTime = Date.now()
    _state.questionId = _allQuestions[0]?.id ?? null
    _state.chapterId  = _chapters[0]?.id ?? null
  }

  // Show first chapter intro
  _renderCurrentChapterIntro()
}

// ─── CHAPTER INTRO ────────────────────────────────────────────────────────────

function _renderCurrentChapterIntro () {
  const chapter = _chapters.find(ch => ch.id === _state.chapterId)
  if (!chapter) return

  track('chapter_view', { chapter_id: chapter.id, chapter_title: chapter.title })

  const card = renderChapterIntro({
    chapter,
    chapterIndex:  _chapters.indexOf(chapter),
    chapterCount:  _chapters.length,
    onBegin:       () => _renderCurrentQuestion('forward')
  })

  _replaceStage(card, 'forward')
  _updateProgress()
  scrollToTop()
}

// ─── QUESTION RENDER ──────────────────────────────────────────────────────────

function _renderCurrentQuestion (dir = 'forward') {
  const question = _allQuestions.find(q => q.id === _state.questionId)
  if (!question) return

  track('question_view', { question_id: question.id, question_type: question.type })
  _state._questionRenderedAt = Date.now()

  const chapter = chapterForQuestion(question.id, _chapters)

  // Existing saved answer for this question
  const savedAnswer = _state.responses[question.id] ?? null

  const container = document.createElement('div')
  container.className = 'survey__question-wrap'
  container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:var(--sp-4);width:100%;'

  // Progress HUD (above card)
  const hud = renderProgressHUD({
    chapter,
    chapterIndex: _chapters.indexOf(chapter),
    chapterCount: _chapters.length,
    completedChapterIds: _getCompletedChapterIds(),
    pct: calcProgress(_allQuestions, _state.responses)
  })
  container.appendChild(hud)

  // Question card
  const card = renderQuestionCard({
    question,
    savedAnswer,
    showCrisis: question.crisisThreshold !== undefined && shouldShowCrisis(_state.responses, _allQuestions),
    crisisResources: _surveyData.crisisResources,
    onAnswer: (value) => _handleAnswer(question.id, value),
    onNext:   () => _advance(),
    onBack:   () => _goBack(),
    onSkip:   () => _skip(question.id)
  })
  container.appendChild(card)

  _replaceStage(container, dir)
  announce(`Question: ${question.label}`)
  scrollToTop()
}

// ─── ANSWER + NAVIGATION ──────────────────────────────────────────────────────

function _handleAnswer (questionId, value) {
  const answerStart = _state._questionRenderedAt ?? Date.now()
  _state.responses[questionId] = value

  track('question_answer', { question_id: questionId, value_type: typeof value })

  const question = _allQuestions.find(q => q.id === questionId)
  const chapter  = chapterForQuestion(questionId, _chapters)

  // Save answer to DB
  saveResponse({
    question_id:      questionId,
    question_text:    question?.label   ?? null,
    question_type:    (question?.type   ?? 'single_choice').replace('-', '_'),
    chapter_id:       chapter?.id       ?? null,
    chapter_title:    chapter?.title    ?? null,
    answer_value:     Array.isArray(value) ? value.join(',') : String(value ?? ''),
    answer_label:     null,
    answer_numeric:   (question?.type === 'likert' || question?.type === 'rating') && !isNaN(Number(value))
                        ? Number(value) : null,
    answer_array:     Array.isArray(value) ? value : null,
    is_skipped:       false,
    time_to_answer_s: Math.round((Date.now() - answerStart) / 1000),
    revision_count:   _state.responses[questionId] !== undefined ? 1 : 0
  })

  // Auto-advance for single-choice questions after a brief pause
  if (question?.type === 'single-choice') {
    setTimeout(() => _advance(), 320)
    return
  }

  _save()
  _updateProgress()
}

function _advance () {
  const nextId = getNextQuestion(_state.questionId, _allQuestions, _state.responses)

  if (!nextId) {
    // Reached end of all questions → complete
    _completeSurvey()
    return
  }

  // Push current to history
  _state.history.push(_state.questionId)

  // Check if we're crossing a chapter boundary
  const currentChapter = chapterForQuestion(_state.questionId, _chapters)
  const nextChapter    = chapterForQuestion(nextId, _chapters)

  _state.questionId = nextId
  _state.chapterId  = nextChapter?.id ?? _state.chapterId

  _save()

  // Sync progress to DB after each navigation step
  updateProgress({
    currentChapter:  _state.chapterId,
    currentQuestion: _state.questionId,
    progressPct:     calcProgress(_allQuestions, _state.responses)
  })

  if (nextChapter && currentChapter && nextChapter.id !== currentChapter.id) {
    // Show chapter intro for new chapter
    _renderCurrentChapterIntro()
  } else {
    _renderCurrentQuestion('forward')
  }

  _updateProgress()
}

function _goBack () {
  if (_state.history.length === 0) return

  const prevId = _state.history.pop()
  _state.questionId = prevId

  const prevChapter = chapterForQuestion(prevId, _chapters)
  _state.chapterId  = prevChapter?.id ?? _state.chapterId

  track('question_view', { question_id: prevId, direction: 'back' })

  _save()
  _renderCurrentQuestion('back')
  _updateProgress()
}

function _skip (questionId) {
  track('question_skip', { question_id: questionId })
  // Mark as explicitly skipped (empty string = touched but skipped)
  _state.responses[questionId] = null
  _advance()
}

// ─── COMPLETION ───────────────────────────────────────────────────────────────

function _completeSurvey () {
  _state.complete = true
  _state.completedAt = Date.now()

  const completionTime = Math.round((_state.completedAt - _state.startTime) / 1000)

  track('survey_complete', {
    completion_time_seconds: completionTime,
    questions_answered: Object.values(_state.responses).filter(v => v !== null && v !== '').length
  })

  completeSession()  // marks DB session completed + clears localStorage
  _save()

  _setProgressBar(100)

  const card = renderCelebration({
    surveyData: _surveyData,
    responses: _state.responses,
    completionTime,
    onClose: () => {
      if (_onComplete) _onComplete(_state.responses)
    }
  })

  _replaceStage(card, 'forward')
  announce('Survey complete — thank you for sharing your story.')
  scrollToTop()
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function _replaceStage (newNode, dir) {
  // Swap immediately (no animation if motion is reduced)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced) {
    _stage.innerHTML = ''
    _stage.appendChild(newNode)
  } else {
    transitionCard(_stage, newNode, dir)
  }
}

function _updateProgress () {
  const pct = _state.complete
    ? 100
    : calcProgress(_allQuestions, _state.responses)

  _setProgressBar(pct)
}

function _setProgressBar (pct) {
  if (_progressFill) _progressFill.style.width = `${pct}%`
  if (_progressBar) {
    _progressBar.setAttribute('aria-valuenow', pct)
    _progressBar.setAttribute('aria-label', `Survey ${pct}% complete`)
  }
}

function _save () {
  saveState({
    chapterId:   _state.chapterId,
    questionId:  _state.questionId,
    responses:   _state.responses,
    history:     _state.history,
    startTime:   _state.startTime,
    complete:    _state.complete
  })
}

function _getCompletedChapterIds () {
  const currentChapterIdx = _chapters.findIndex(ch => ch.id === _state.chapterId)
  return _chapters
    .slice(0, Math.max(0, currentChapterIdx))
    .map(ch => ch.id)
}
