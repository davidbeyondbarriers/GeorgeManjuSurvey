# Repository File Tree

Generated after monorepo reorganization — 2026-05-31.

```
george-manju-survey/
│
├── CLAUDE.md                              Project instructions for Claude Code
├── README.md                              Getting started, local dev, testing, AWS deploy
├── TREE.md                                This file
├── ARCHITECTURE.md                        Why each top-level folder exists
├── package.json                           Root package — all scripts, all deps
├── package-lock.json
├── vite.config.js                         root: frontend/, outDir: ../dist
├── .env.example                           Every env var documented
│
├── frontend/                              Vite SPA — everything the browser loads
│   ├── index.html                         HTML entry point
│   ├── preview.html                       Design reference / standalone preview
│   ├── public/
│   │   └── assets/
│   │       ├── george-manju.png           Combined guide photo
│   │       ├── George_P.png               George individual photo
│   │       └── Manju_P.png                Manju individual photo
│   └── src/
│       ├── main.js                        Boot sequence (hero → motivation → survey)
│       ├── analytics/
│       │   └── track.js                   PostHog-ready event wrapper
│       ├── components/
│       │   ├── hero.js                    Hero section, guide cards, chat bubbles
│       │   ├── chapter-intro.js           George/Manju between-chapter moments
│       │   ├── crisis.js                  Sensitive content handling
│       │   ├── question-types.js          All question variant renderers
│       │   ├── progress.js                Completion %, milestone tracker
│       │   └── celebration.js             Completion screen & story sharing
│       ├── data/
│       │   ├── survey.json                All questions, chapters, adaptive rules
│       │   └── pins.json                  Geographic pin data
│       ├── engine/
│       │   ├── survey-engine.js           Core render & state machine
│       │   ├── adaptive-logic.js          Skip logic, branching, conditional reveals
│       │   └── navigation.js             Section transitions & scrolling
│       ├── persistence/
│       │   └── autosave.js                localStorage autosave + API fire-and-forget
│       ├── styles/
│       │   ├── tokens.css                 Design tokens — mint green palette, spacing
│       │   ├── base.css                   Baseline styles, typography, resets
│       │   ├── components.css             Aurora layers, bubbles, cards, progress
│       │   └── animations.css             Keyframes — aurora1/2/3, fade-up, pulse-glow
│       └── three/
│           └── hero-scene.js              WebGL aurora borealis — GLSL shaders + star field
│
├── backend/                               Express API + database layer
│   ├── src/
│   │   ├── server.js                      Express app (migrations on start, static in prod)
│   │   ├── db/
│   │   │   └── client.js                  pg.Pool (reads DATABASE_URL)
│   │   └── routes/
│   │       ├── session.js                 POST + PATCH /api/session
│   │       ├── response.js                POST /api/response
│   │       └── event.js                   POST /api/event
│   ├── db/
│   │   ├── migrate.js                     Migration runner (auto on startup + standalone)
│   │   ├── seed.js                        Sample data for Adminer verification
│   │   └── migrations/
│   │       └── 001_initial_schema.sql     sessions + responses + events + 8 indexes
│   └── tests/
│       ├── api.contract.test.js           14 tests — valid payloads → 202 (no DB needed)
│       ├── validation.test.js             19 tests — bad payloads → 400 (no DB needed)
│       └── db.test.js                     11 tests — persistence verified (auto-skip)
│
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile                     3-stage: dev / build / production
│   │   ├── docker-compose.yml             Local stack: DB + API + Adminer
│   │   └── docker-compose.prod.yml        AWS ECS/RDS mapping reference
│   ├── cloudflare/
│   │   ├── worker.js                      Security headers + asset cache headers
│   │   └── wrangler.toml                  Worker: georgemanjusurvey, assets: ../../dist
│   └── netlify-archive/                   Broken legacy code — kept for reference
│       ├── netlify.toml
│       ├── database/migrations/
│       │   └── 20260531000000_create-survey-schema.sql
│       └── functions/
│           ├── event.js
│           ├── response.js
│           └── session.js
│
├── docs/
│   ├── specifications/
│   │   └── backend.md                     API contract, DB schema, auth model, NFRs
│   ├── requirements/                      (placeholder — add brief.md / brief.docx)
│   ├── architecture/                      (placeholder — add ADRs)
│   └── deployment/                        (placeholder — add runbooks)
│
├── assets/                                Source materials — not built, not served
│   ├── brand/
│   │   ├── george-manju.png               Combined guide photo (source)
│   │   ├── George_P.png                   George individual photo (source)
│   │   └── Manju_P.png                    Manju individual photo (source)
│   └── documents/
│       ├── Post_Traumatic_Growth_Survey.docx
│       ├── TraumaSurvey_Template_v1.xlsx
│       └── iteration-1-feedback.docx
│
├── inputs/                                Original source drop folder (shell working dir)
│   └── assets/                            Same files — see assets/ for organised copies
│
└── dist/                                  Vite build output — gitignored, not committed
    ├── index.html
    └── assets/
        └── ...                            Hashed JS/CSS bundles
```
