# George & Manju Survey

A premium, chapter-based storytelling survey experience hosted by **George** and **Manju** as warm guides. This is not your typical form — it's an emotionally engaging, interactive journey that makes participants want to complete it, share their story, and feel heard.

**Repository:** https://github.com/davidbeyondbarriers/GeorgeManjuSurvey

---

## Project Goal

Transform a traditional survey into a human-centered experience where participants:
- Want to **complete** the full survey
- Feel encouraged to **share their story**
- Feel **heard and appreciated**
- **Trust the process**

Success is measured by completion rate and participant feedback, not just visual polish.

---

## Tech Stack

### Frontend

| Technology | Purpose | Version |
|---|---|---|
| **Vite** | Fast build tool & dev server (port 5200) | ^5.3.1 |
| **Vanilla JavaScript** | Core survey engine, navigation, state | ES2020+ |
| **Three.js** | WebGL aurora borealis hero (lazy-loaded) | ^0.165.0 |
| **GLSL Shaders** | Fragment + vertex shaders for aurora ribbons | — |
| **CSS3** | Adaptive, accessible styling with design tokens | — |
| **HTML5** | Semantic, accessible markup | — |

**Key Architecture:**
- **Data-driven engine**: All questions and adaptive rules live in `src/data/survey.json`
- **Modular components**: Hero, motivation intro, question types, progress tracking, celebration
- **WebGL aurora**: Three.js ShaderMaterial with custom GLSL — three animated ribbon layers (mint-green, teal, blue-violet), star field with mouse/touch parallax, `prefers-reduced-motion` fallback to static CSS aurora
- **Lazy loading**: Three.js loads asynchronously after first paint — never blocks the hero
- **Responsive design**: Mobile-first, fluid typography with `clamp()`, adaptive layouts with CSS Grid
- **Progressive enhancement**: CSS aurora fallback when WebGL is unavailable

### Backend (Planned)

| Technology | Purpose |
|---|---|
| **Supabase** | PostgreSQL database, real-time subscriptions, auth |
| **PostHog** (or Plausible) | Privacy-respecting analytics & completion tracking |
| **Netlify** | Static hosting, CDN, serverless functions |

**Strategy:** Ship a fully functional static frontend first. Add Supabase behind a thin persistence layer — the frontend is unchanged when the backend activates.

---

## Project Structure

```
george-manju-survey/
├── index.html                  # Main HTML entry point
├── preview.html                # Design reference / standalone preview
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite config — port 5200, strictPort
├── netlify.toml                # Netlify deployment config
│
├── inputs/                     # Source materials (not committed)
│   └── assets/
│       ├── George_P.png        # George individual photo (source)
│       ├── Manju_P.png         # Manju individual photo (source)
│       ├── george-manju.png    # Combined guide photo (source)
│       └── ...
│
├── public/                     # Static assets served as-is
│   └── assets/
│       ├── george-manju.png    # Combined guide photo
│       ├── George_P.png        # George individual photo (bubble avatar)
│       └── Manju_P.png         # Manju individual photo (bubble avatar)
│
└── src/
    ├── main.js                 # Boot sequence (hero → motivation → survey)
    │
    ├── data/
    │   └── survey.json         # Survey questions, adaptive rules, config
    │
    ├── engine/
    │   ├── survey-engine.js    # Core render & state management
    │   ├── adaptive-logic.js   # Skip logic, branching, conditional routes
    │   └── navigation.js       # Section transitions & scrolling
    │
    ├── components/
    │   ├── hero.js             # Hero section, guide cards, chat bubbles
    │   ├── chapter-intro.js    # Between-chapter George/Manju moments
    │   ├── crisis.js           # Sensitive content handling
    │   ├── question-types.js   # Renders all question variants
    │   ├── progress.js         # Completion %, milestone tracker
    │   └── celebration.js      # Completion screen & story sharing
    │
    ├── analytics/
    │   └── track.js            # Event tracking wrapper (PostHog ready)
    │
    ├── persistence/
    │   └── autosave.js         # localStorage autosave & Supabase adapter
    │
    ├── styles/
    │   ├── tokens.css          # Design tokens — mint green palette, spacing, motion
    │   ├── base.css            # Baseline styles, typography, resets
    │   ├── components.css      # Component styles — aurora layers, bubbles, progress
    │   └── animations.css      # Keyframes — aurora1/2/3, fade-up, pulse-glow
    │
    └── three/
        └── hero-scene.js       # WebGL aurora borealis — GLSL shaders + star field
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (20 recommended for production builds)
- **npm** 10+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/davidbeyondbarriers/GeorgeManjuSurvey.git
cd george-manju-survey

# Install dependencies
npm install
```

### Development

```bash
# Start dev server — opens at http://localhost:5200
npm run dev
```

The dev server includes:
- Hot Module Replacement (HMR) for instant feedback
- Source maps for easier debugging
- Fixed port 5200 (`strictPort: true`) — will error rather than silently bump ports

### Building for Production

```bash
# Build optimized static assets
npm run build

# Preview production build locally
npm run preview
```

Output goes to `dist/`, ready for Netlify deployment.

---

## Core Features

### 1. WebGL Aurora Borealis Hero

A full-viewport Three.js scene built with custom GLSL shaders:
- **Three aurora ribbon layers**: primary mint-green, teal mid-layer, blue-violet fringe
- **Value noise + layered sine waves**: organic undulation like real northern lights
- **Star field**: 400 particles (200 on mobile) with mouse/touch parallax
- **Adaptive performance**: pixel ratio capped at 1.5× on mobile, `low-power` GPU preference
- **Graceful fallback**: CSS-only animated aurora shown when WebGL is unavailable or `prefers-reduced-motion` is active

### 2. George & Manju Guide Experience

- Combined photo in the hero guide card with mint-glow border
- Individual Manju and George photos in animated chat bubbles (staggered 700ms each)
- Guide reappearance between chapters as warm conversational milestones

### 3. Data-Driven Survey Engine

All questions and routing live in `src/data/survey.json`:
- Single/multiple choice, Likert, rating, short text, long-form story, dropdown
- Skip logic, branching paths, conditional reveals
- No question markup is hard-coded — the engine renders from config

### 4. Adaptive Design

- Fluid typography via `clamp()` — text scales smoothly across all viewports
- CSS custom property design tokens — mint green palette, green-tinted shadows
- `prefers-reduced-motion`: animations disabled, WebGL paused, CSS static fallback shown
- `prefers-color-scheme`: token system ready for dark/light theming
- Mobile-first layouts, touch targets ≥ 44px, WCAG 2.2 AA contrast

### 5. Progress & Completion

- Real-time completion percentage with animated progress bar
- Chapter milestone tracker
- Estimated time remaining
- Genuine celebration screen at completion

### 6. Autosave & Persistence

- Transparent localStorage autosave — no manual Save button
- Resume banner on return visit
- Supabase adapter ready for server-side persistence

### 7. Analytics

Events fire through `src/analytics/track.js`:

```javascript
track('survey_start')
track('chapter_view',   { chapter: 'ch-1' })
track('question_answer', { question_id: 'q1', time_spent: 45 })
track('survey_complete', { completion_time: 720 })
track('drop_off',        { last_question: 'q7' })
```

---

## Design System

**Mint green palette** defined in `src/styles/tokens.css`:

| Token | Value | Use |
|---|---|---|
| `--clr-mint` | `#3ECFA0` | Accents, CTA, progress |
| `--clr-mint-dark` | `#2A8B6F` | Primary text accents, borders |
| `--clr-primary` | `#1F6B50` | Deep forest green |
| `--clr-bg` | `#F6FAF8` | Light page background |
| `--clr-surface-hero` | `#060D1A` | Aurora hero sky |
| `--clr-navy` | `#0C1829` | Dark surfaces |

All shadows are green-tinted. All focus rings use `--clr-mint-dark`.

---

## Deployment

### Netlify

Push to `main` — Netlify auto-deploys via webhook.

**`netlify.toml` config:**
- Build command: `npm run build`
- Publish directory: `dist/`
- Node version: 20
- SPA routing (all paths → index.html)
- Security headers preconfigured

### Environment Variables

Create a `.env` file (not committed):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_POSTHOG_KEY=your_posthog_key
```

---

## Troubleshooting

**Port 5200 already in use**
Another process is holding 5200. Check with `netstat -ano | findstr :5200` and kill that process, or temporarily change the port in `vite.config.js`.

**Aurora not showing**
WebGL is unavailable in this browser — the CSS animated aurora fallback will show instead. Check the browser console for WebGL errors.

**Three.js not loading on mobile**
The hero scene gracefully degrades to the CSS aurora if WebGL fails. This is expected on some older or low-memory Android devices.

**Autosave not persisting**
Check localStorage is enabled in browser settings. Clear cache and retest. See `src/persistence/autosave.js`.

---

## Privacy & Security

- No third-party trackers beyond chosen analytics provider
- Security headers configured in `netlify.toml`
- GDPR-compliant data handling
- Optional Supabase end-to-end encryption

---

## Design Philosophy

> "This feels like a premium interactive storytelling website — Apple / Airbnb / Stripe / Notion / Headspace — not a Google Forms / Typeform clone."

Every decision prioritises:
- **Human connection** over form efficiency
- **Completion** over data collection volume
- **Trust** over convenience
- **Accessibility** over visual wow-factor
- **Performance** over framework complexity

---

## Team

- **David Francis** — Project lead & frontend architect
- **George & Manju** — Survey guides & emotional anchors

---

**Last Updated:** 31 May 2026
**Repository:** https://github.com/davidbeyondbarriers/GeorgeManjuSurvey
