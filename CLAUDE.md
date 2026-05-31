# George & Manju Survey — Project Instructions

An emotionally engaging, browser-based survey experience hosted by **George**
and **Manju** as warm guides. It must feel like a premium interactive
storytelling website — Apple / Airbnb / Stripe / Notion / Headspace — **not** a
Google Forms / Typeform / Microsoft Forms clone. Deployed publicly via
**Netlify**.

> Use the **`survey-experience-designer`** skill for all design and build work
> on this project. This file records the project-specific decisions; the skill
> carries the reusable process and standards.

---

## Goal

Turn a traditional survey into a chapter-based journey that makes participants
want to **complete it, share their story, feel heard, feel appreciated, and
trust the process**. Success is measured by **completion rate**, not visuals.

## Source inputs (place in `/inputs`)

- `questions.xlsx` — all survey questions + response options. Each row maps to a
  question type and may carry conditional/branching rules.
- `brief.docx` — survey purpose, background, motivation, participant messaging.
  Source the hero copy and the ≤120-word motivation summary from here.
- `adaptive-web-design.md` — design principles (from the Notion page).
- `assets/` — George photo, Manju photo, logo, brand colours/fonts.

When an input is missing, state the assumption and proceed.

## The guides — George & Manju

- Present them as friendly visual cards in the hero with emoji conversation
  bubbles; dialogue must feel natural and warm, e.g.
  - 👩 Manju: "Welcome! We're so glad you're here."
  - 👨 George: "Thank you for taking the time to share your story with us."
- They reappear between chapters as a conversational milestone, not decoration.
- Tone everywhere: warm, encouraging, respectful, trustworthy.

---

## Tech stack (decided)

| Layer | Choice |
|---|---|
| Build | **Vite + Vanilla JS** |
| 3D | **Three.js** — hero section only, lazy-loaded |
| Animation | **GSAP** + ScrollTrigger |
| Backend (when ready) | **Supabase** (Postgres, auth, storage, realtime) |
| Analytics | **PostHog** (or Plausible if privacy-first is preferred) |
| Hosting | **Netlify** |

Ship a static, backend-optional build first; wire Supabase later behind a thin
data layer so the front end doesn't change when persistence lands.

## Folder structure

```
george-manju-survey/
├── CLAUDE.md
├── index.html
├── inputs/                 # source xlsx, docx, design principles, assets
├── public/                 # static assets served as-is
├── src/
│   ├── main.js             # entry: boot order (hero paint → engine)
│   ├── data/
│   │   └── survey.json     # questions + adaptive rules (data-driven engine)
│   ├── engine/             # render, navigation, adaptive/skip/branch logic
│   ├── components/         # hero, motivation, question types, progress, story
│   ├── styles/             # tokens.css, base.css, components, animations
│   ├── analytics/          # track() wrapper + event map
│   ├── persistence/        # localStorage autosave/resume; Supabase adapter
│   └── three/              # hero 3D scene (lazy)
├── netlify.toml
└── package.json
```

## Survey engine = data-driven

Define every question and adaptive rule in `src/data/survey.json`. The engine
renders and routes from that config — never hard-code question markup. Support:
single/multiple choice, Likert, rating, short text, long-form story, dropdown,
conditional questions; with skip logic, branching, dynamic paths, conditional
reveals.

## Progress + completion

Always show: completion %, milestone tracker, section progress, estimated time
remaining. End on a genuine completion celebration that makes the participant
feel appreciated. Autosave progress to localStorage so a refresh never loses it.

## Story-sharing section

Near the end, a dedicated, safe, inviting space for personal experiences,
insights, challenges, and success stories. Low pressure, generous, human.

---

## Non-negotiables

- **Accessibility — WCAG 2.2 AA, mandatory.** Full keyboard nav, screen-reader
  labels + `aria-live`, contrast ≥ 4.5:1, high-contrast safe,
  `prefers-reduced-motion` respected, touch targets ≥ 44px.
- **Mobile-first.** Build the phone layout first; completing on mobile must feel
  effortless. Desktop is the enhancement.
- **Performance.** Lazy-load Three.js/heavy media; keep initial JS lean; test on
  a throttled mid-range phone before claiming done.
- **Motion with purpose.** No animation that costs mobile performance.

## Analytics events

`survey_start`, `chapter_view`, `question_view`, `question_answer`,
`question_skip`, `drop_off`, `survey_complete`, `completion_time`,
`device_type` — all through the `track()` wrapper so the tool is swappable.

## Netlify deployment

- Build command: `npm run build` · Publish dir: `dist`
- Env vars (when backend lands): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_POSTHOG_KEY`.
- Add SPA redirect in `netlify.toml` if client routing is used.

## Definition of done

Premium on mobile and desktop · all adaptive paths route correctly · every
accessibility check passes · analytics fire · progress autosaves · participant
reaches a real completion celebration. Anything less is a draft.
