# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

An emotionally engaging, browser-based survey experience hosted by **George**
and **Manju** as warm guides. It must feel like a premium interactive
storytelling website — Apple / Airbnb / Stripe / Notion / Headspace — **not** a
Google Forms / Typeform / Microsoft Forms clone. Deployed publicly via
**Cloudflare Workers**.

> Use the **`survey-experience-designer`** skill for all design and build work
> on this project. This file records the project-specific decisions; the skill
> carries the reusable process and standards.

---

## Commands

```bash
npm run dev       # Vite dev server — hot reload, no build step
npm run build     # Vite production build → dist/
npm run preview   # Serve dist/ locally (mirrors Cloudflare behaviour)
npm run deploy    # vite build + wrangler deploy → Cloudflare Workers
```

Set `VITE_POSTHOG_KEY` before build to activate PostHog analytics. Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are reserved for when the Supabase backend layer is wired up.

---

## Goal

Turn a traditional survey into a chapter-based journey that makes participants
want to **complete it, share their story, feel heard, feel appreciated, and
trust the process**. Success is measured by **completion rate**, not visuals.

## Source inputs (place in `/inputs`)

- `questions.xlsx` — all survey questions + response options
- `brief.docx` — survey purpose, background, motivation, participant messaging
- `adaptive-web-design.md` — design principles
- `assets/` — George photo, Manju photo, logo, brand colours/fonts

When an input is missing, state the assumption and proceed.

## The guides — George & Manju

- Present them as friendly visual cards in the hero with emoji conversation bubbles; dialogue must feel natural and warm
- They reappear between chapters as a conversational milestone, not decoration
- Tone everywhere: warm, encouraging, respectful, trustworthy

---

## Tech stack

| Layer | Choice |
|---|---|
| Build | **Vite + Vanilla JS** (ES modules, no framework) |
| 3D | **Three.js** — hero aurora scene only, lazy-loaded |
| Animation | CSS animations via `animations.css` + JS class toggling |
| Analytics | **PostHog** via `src/analytics/track.js` wrapper |
| Hosting | **Cloudflare Workers** (Workers Assets for static serving) |

No framework, no GSAP (despite the original plan — removed). Three.js is the only runtime dependency.

---

## Architecture

### 3-stage page flow

```
hero (always visible on load)
  └─ CTA click → motivation section (hidden → shown)
       └─ CTA click → survey main (hidden → shown)
            └─ survey engine renders chapters + questions into #survey-stage
```

Each stage transition uses `showSection` / `hideSection` in `src/engine/navigation.js` with CSS fade. The Three.js aurora runs on `#hero-canvas` and is lazy-loaded so hero paint is never blocked.

### Data-driven survey engine

All questions and adaptive rules live in `src/data/survey.json` — never hard-code question markup. The engine at `src/engine/survey-engine.js` is the single state owner:

```js
_state = { chapterId, questionId, responses, history, startTime, complete }
_allQuestions  // flat ordered array across all chapters
_chapters      // chapter config array
```

Flow within the engine:
1. `initSurvey()` — flattens chapters into `_allQuestions`, restores saved state if offered
2. `_showChapterIntro()` — renders the chapter card via `renderChapterIntro()`
3. `_showQuestion()` — resolves visibility via `shouldShow()`, renders card via `renderQuestionCard()`
4. `_onAnswer()` / `_goNext()` / `_goBack()` — update state, autosave, analytics, advance

### Adaptive logic (`src/engine/adaptive-logic.js`)

Skip logic is declared per-question in `survey.json` as:
```json
"showIf": { "questionId": "q_trauma_yn", "values": ["yes"] }
```
`shouldShow(question, responses)` evaluates this at render time. `getNextQuestion` / `getPrevQuestion` automatically skip hidden questions. `shouldShowCrisis` triggers if any question has `crisisThreshold` and the response meets it.

### Question types (`src/components/question-types.js`)

`renderQuestionCard()` is the single entry point. Supported `type` values:
`single-choice` · `rating` · `number` · `pin-location` · `story` · `consent` · `birth-date`

Each renderer returns an `HTMLElement`; the engine provides all callbacks — components never touch engine state directly.

### Persistence (`src/persistence/autosave.js`)

Two layers:
- **localStorage** (key `gm_survey_v1`) — always-on, 7-day TTL, primary autosave
- **API calls** to `/api/session`, `/api/response`, `/api/event` — fire-and-forget, never block the survey. Currently stubbed; requires a Worker route or Supabase backend to be wired up.

> **Known gap:** `db/index.js` still imports `@netlify/database` — a leftover from before the Netlify → Cloudflare migration. The API endpoints (`/api/*`) are not yet implemented in `worker.js`. localStorage is the live persistence path.

### Styles load order (matters — don't change)

```
tokens.css → base.css → components.css → animations.css
```

`tokens.css` defines all CSS custom properties (colours, spacing, typography, z-index, shadows, easing). Reference tokens in component CSS — never use raw hex/px values.

Design tokens palette: deep forest green primary (`#1F6B50`), mint accent (`#3ECFA0`), terracotta warmth (`#C85C35`), dark hero surface (`#060D1A`).

### Analytics (`src/analytics/track.js`)

Call `track(eventName, props)` everywhere — this is the only analytics call site. PostHog activates when `VITE_POSTHOG_KEY` is set; otherwise degrades silently. Every `track()` call also fires `logEvent()` to the `/api/event` DB endpoint (fire-and-forget).

---

## Folder structure

```
george-manju-survey/
├── index.html              # all 3 sections (hero/motivation/survey) in one HTML; JS controls visibility
├── worker.js               # Cloudflare Worker: security headers + asset caching
├── wrangler.toml           # Cloudflare config: worker name, assets dir, SPA routing
├── db/index.js             # DB client — currently @netlify/database (needs updating)
├── public/assets/          # photos, logo — served as-is
└── src/
    ├── main.js             # boot: device detect → hero → motivation → survey
    ├── data/survey.json    # single source of truth for all questions + branching
    ├── engine/
    │   ├── survey-engine.js    # state machine; orchestrates all engine modules
    │   ├── adaptive-logic.js   # shouldShow(), getNext/PrevQuestion(), calcProgress()
    │   └── navigation.js       # transitionCard(), showSection(), hideSection(), announce()
    ├── components/
    │   ├── hero.js             # bubble animation sequence, guide card init
    │   ├── chapter-intro.js    # chapter milestone cards (guide message + Begin CTA)
    │   ├── question-types.js   # renderQuestionCard() + all input renderers
    │   ├── progress.js         # renderProgressHUD() — % bar, chapter dots, time estimate
    │   ├── celebration.js      # survey completion screen
    │   └── crisis.js           # crisis resources card (shown when crisisThreshold met)
    ├── styles/
    │   ├── tokens.css          # all CSS custom properties
    │   ├── base.css            # reset, typography, global utilities
    │   ├── components.css      # all component styles
    │   └── animations.css      # keyframes, transition classes
    ├── analytics/track.js      # track() wrapper; swap provider here only
    ├── persistence/autosave.js # localStorage + /api/* fire-and-forget
    └── three/hero-scene.js     # WebGL aurora + star field (lazy-loaded)
```

---

## Adding questions or chapters

1. Edit `src/data/survey.json` only — the engine renders from config
2. Use `showIf: { questionId, values }` for conditional visibility
3. Set `crisisThreshold` on a `rating`-type question to trigger the crisis card
4. Add `required: true` to enforce validation before Next

## Progress + completion

Always show: completion %, chapter progress, estimated time remaining. End on a genuine completion celebration (`celebration.js`). Autosave progress to localStorage so a refresh never loses it.

---

## Non-negotiables

- **Accessibility — WCAG 2.2 AA, mandatory.** Full keyboard nav, screen-reader labels + `aria-live`, contrast ≥ 4.5:1, `prefers-reduced-motion` respected, touch targets ≥ 44px.
- **Mobile-first.** Build the phone layout first; desktop is the enhancement.
- **Performance.** Three.js/heavy media lazy-load only; keep initial JS lean.
- **Motion with purpose.** No animation that costs mobile performance.

## Cloudflare deployment

- Deploy: `npm run deploy` (runs `vite build` then `wrangler deploy`)
- Worker name: `georgemanjusurvey` · Assets dir: `dist`
- SPA routing: `not_found_handling = "single-page-application"` in `wrangler.toml`
- Security headers + asset cache: `worker.js` via `env.ASSETS.fetch()`
- Runtime secrets: `wrangler secret put SECRET_NAME`

## Definition of done

Premium on mobile and desktop · all adaptive paths route correctly · every accessibility check passes · analytics fire · progress autosaves · participant reaches a real completion celebration. Anything less is a draft.
