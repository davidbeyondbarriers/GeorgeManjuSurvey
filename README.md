# George & Manju Survey

A premium, chapter-based storytelling survey experience hosted by **George** and **Manju** as warm guides. This is not your typical form — it's an emotionally engaging, interactive journey that makes participants want to complete it, share their story, and feel heard.

**Deployed at:** [GeorgeManjuSurvey](https://github.com/davidfrancisloretta/GeorgeManjuSurvey)

---

## 🎯 Project Goal

Transform a traditional survey into a human-centered experience where participants:
- Want to **complete** the full survey
- Feel encouraged to **share their story**
- Feel **heard and appreciated**
- **Trust the process**

Success is measured by completion rate and participant feedback, not just visual polish.

---

## 🛠️ Tech Stack

### **Frontend**

| Technology | Purpose | Version |
|---|---|---|
| **Vite** | Fast build tool & dev server | ^5.3.1 |
| **Vanilla JavaScript** | Core survey engine, navigation, state | ES2020+ |
| **Three.js** | 3D hero section (lazy-loaded, non-blocking) | ^0.165.0 |
| **CSS3** | Responsive, accessible styling | — |
| **HTML5** | Semantic, accessible markup | — |

**Key Architecture:**
- **Data-driven engine**: All questions and adaptive rules live in `src/data/survey.json`
- **Modular components**: Hero, motivation intro, question types, progress tracking, celebration
- **Lazy loading**: Three.js loads asynchronously to keep initial paint fast
- **Responsive design**: Mobile-first, optimized for all screen sizes
- **Progressive enhancement**: Works without JavaScript for core content

### **Backend** (Planned)

| Technology | Purpose |
|---|---|
| **Supabase** | PostgreSQL database, real-time subscriptions, auth |
| **PostHog** (or Plausible) | Privacy-respecting analytics & completion tracking |
| **Netlify** | Static hosting, serverless functions (if needed), CDN |

**Strategy:**
- Ship a fully functional **static frontend** first
- Add optional Supabase integration behind a thin data persistence layer
- Frontend remains unchanged when backend is activated

---

## 📁 Project Structure

```
george-manju-survey/
├── index.html                  # Main HTML entry point
├── preview.html                # Preview/testing page
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite configuration
├── netlify.toml                # Netlify deployment config
│
├── inputs/                     # Source materials (do not commit)
│   └── assets/
│       ├── George_P.png
│       ├── Manju_P.png
│       ├── george-manju.png
│       ├── Post_Traumatic_Growth_Survey.docx
│       ├── TraumaSurvey_Template_v1.xlsx
│       └── iteration-1-feedback.docx
│
├── public/                     # Static assets (served as-is)
│   └── assets/
│       └── george-manju.png
│
└── src/
    ├── main.js                 # Boot sequence (hero → motivation → survey)
    │
    ├── data/
    │   ├── survey.json         # Survey questions, adaptive rules, config
    │   └── pins.json           # Pin/location data (if applicable)
    │
    ├── engine/
    │   ├── survey-engine.js    # Core render & state management
    │   ├── adaptive-logic.js   # Skip logic, branching, conditional routes
    │   └── navigation.js       # Section transitions & scrolling
    │
    ├── components/
    │   ├── hero.js             # Hero section & guide intros
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
    │   ├── tokens.css          # Design tokens (colors, spacing, fonts)
    │   ├── base.css            # Baseline styles, typography, resets
    │   ├── components.css      # Component-scoped styles
    │   └── animations.css      # Keyframe animations & transitions
    │
    └── three/
        └── hero-scene.js       # Three.js 3D scene initialization
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (or 20 for production builds)
- **npm** 10+ (or yarn/pnpm)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/davidfrancisloretta/GeorgeManjuSurvey.git
cd george-manju-survey

# Install dependencies
npm install
```

### Development

```bash
# Start dev server (auto-opens at http://localhost:5173)
npm run dev
```

The dev server includes:
- ✅ Hot Module Replacement (HMR) for instant feedback
- ✅ Source maps for easier debugging
- ✅ Automatic browser refresh on file changes

### Building for Production

```bash
# Build optimized static assets
npm run build

# Preview production build locally
npm run preview
```

Output is in the `dist/` folder, ready for deployment.

---

## ✨ Core Features

### 1. **Data-Driven Survey Engine**
Every question and adaptive rule is defined in `src/data/survey.json`:
- Single/multiple choice questions
- Likert scales
- Rating sliders
- Short-form & long-form text
- Dropdown selects
- Conditional questions (skip logic)
- Branching paths based on answers
- Dynamic question reveals

### 2. **Adaptive Logic**
- Smart branching: Tailor the survey path based on responses
- Skip logic: Omit irrelevant sections
- Conditional reveals: Show/hide questions based on prior answers
- Fallback paths: Graceful degradation if branches don't apply

### 3. **Progress Tracking**
- Real-time completion percentage
- Milestone markers ("You've reached Chapter 3")
- Estimated time remaining
- Mobile-friendly progress indicator
- Resume from saved progress on return

### 4. **Premium UX Moments**
- **Hero section**: Immersive introduction with optional 3D scene
- **Guide intros**: George & Manju appear between chapters for warmth
- **Crisis moments**: Sensitive content handled with care (content warnings, pacing)
- **Celebration screen**: Genuine appreciation + story sharing space

### 5. **Autosave & Persistence**
- Transparent localStorage autosave (no manual "Save" button)
- Surveyors can close & resume later without data loss
- Supabase integration (backend-ready) for server-side storage

### 6. **Accessibility**
- WCAG 2.2 AA compliant
- Semantic HTML5 markup
- Keyboard navigation throughout
- Sufficient color contrast
- Screen reader friendly

### 7. **Mobile-First Responsive**
- Optimized for mobile, tablet, desktop
- Touch-friendly controls
- Readable typography at all sizes
- Fast load time (< 3s on 4G)

### 8. **Analytics Ready**
- Event tracking wrapper (PostHog/Plausible compatible)
- Completion tracking
- Drop-off identification
- User journey heatmaps
- Demographic segmentation

---

## 📊 Survey Structure (Example)

**`src/data/survey.json`** defines:

```json
{
  "hero": {
    "title": "George & Manju's Post-Traumatic Growth Survey",
    "subtitle": "Your story matters. Thank you for sharing.",
    "bubbles": [
      { "speaker": "george", "text": "Welcome! We're so glad you're here." },
      { "speaker": "manju", "text": "Thank you for taking the time to share your story with us." }
    ]
  },
  "chapters": [
    {
      "id": "ch-1-demographics",
      "title": "Let's Start",
      "questions": [
        {
          "id": "q1",
          "type": "text",
          "prompt": "What is your name?",
          "required": true
        },
        {
          "id": "q2",
          "type": "multiple_choice",
          "prompt": "How would you describe your experience?",
          "options": [
            "Very difficult",
            "Moderately difficult",
            "Challenging but manageable"
          ]
        }
      ]
    },
    {
      "id": "ch-2-experiences",
      "title": "Tell Us Your Story",
      "questions": [
        {
          "id": "q3",
          "type": "long_form",
          "prompt": "What challenges have you overcome?",
          "conditional": {
            "trigger": "q2",
            "value": "Very difficult",
            "show": true
          }
        }
      ]
    }
  ],
  "celebration": {
    "title": "You Did It!",
    "message": "Thank you for your honesty and courage.",
    "sharing": {
      "enabled": true,
      "prompt": "Would you like to share anything else with us?"
    }
  }
}
```

---

## 🔌 Analytics & Tracking

All events flow through `src/analytics/track.js`:

```javascript
import { track } from './analytics/track.js'

// Standard events
track('survey_started')
track('chapter_completed', { chapter: 'ch-1' })
track('question_answered', { question_id: 'q1', time_spent: 45 })
track('survey_completed', { completion_time: 720 })
```

**PostHog Integration (ready in backend):**
- Event ingestion
- Funnel analysis (where people drop off)
- Cohort analysis (who completes vs. abandons)
- Heatmaps (which questions take longest)

---

## 🔐 Privacy & Security

- ✅ No third-party trackers (beyond analytics)
- ✅ Security headers configured (Netlify)
- ✅ Content Security Policy (CSP) ready
- ✅ GDPR-compliant data handling
- ✅ Optional end-to-end encryption (Supabase)

---

## 🚢 Deployment

### Netlify (Current)

```bash
# Push to main branch
git push origin main

# Netlify auto-deploys via webhook
```

**Netlify config** (`netlify.toml`):
- Build command: `npm run build`
- Publish directory: `dist/`
- Node version: 20
- SPA routing (all paths → index.html)
- Security headers preconfigured
- Aggressive asset caching

### Environment Variables

Create a `.env` file (not committed):

```env
VITE_SURVEY_ENDPOINT=https://api.example.com
VITE_ANALYTICS_KEY=your_posthog_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Access in code:

```javascript
const endpoint = import.meta.env.VITE_SURVEY_ENDPOINT
```

---

## 🔄 Development Workflow

### Local Testing

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Build watcher (optional)
npm run build -- --watch
```

### Before Pushing

```bash
# Build locally to catch errors
npm run build

# Preview production build
npm run preview

# Run through complete survey manually
# Test on mobile device or DevTools
```

### Git Workflow

```bash
git checkout -b feature/new-question-type
# ... make changes ...
git add .
git commit -m "feat: add Likert scale question type"
git push origin feature/new-question-type
# Open PR on GitHub
```

---

## 📖 Documentation

- **`CLAUDE.md`** — Project brief, goals, tech decisions
- **`netlify.toml`** — Deployment configuration
- **`vite.config.js`** — Build & dev server config
- **`src/data/survey.json`** — Survey content & logic
- **Survey engine comments** — Architecture notes in each module

---

## 🆘 Troubleshooting

### Port 5173 already in use
```bash
# Use a different port
npm run dev -- --port 3000
```

### Build size too large
Check `vite.config.js` chunking and check which dependencies are bloating the bundle:
```bash
npm run build -- --analyze
```

### Three.js not loading on mobile
- Hero scene gracefully degrades if WebGL unavailable
- Check console for errors; 3D is enhancement, not requirement

### Autosave not persisting
- Check browser's localStorage is enabled
- Clear browser cache and test again
- Verify `src/persistence/autosave.js` logic

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-idea`
3. **Commit** with clear messages: `git commit -m "feat: describe what you added"`
4. **Push** to GitHub: `git push origin feature/your-idea`
5. **Open a Pull Request** with details

### Code Style
- Modular, single-responsibility functions
- JSDoc comments for public functions
- Consistent indentation (2 spaces)
- Mobile-first CSS

---

## 📜 License

This project is private. Contact the maintainers for usage rights.

---

## 👥 Team

- **David Francis** — Project lead & frontend architect
- **George & Manju** — Survey guides & emotional anchors

---

## 📞 Support

For issues, feature requests, or questions:
1. Check the `inputs/iteration-1-feedback.docx` for known constraints
2. Open a GitHub issue with details
3. Contact the project maintainers

---

## 🎨 Design Philosophy

> "This feels like a premium interactive storytelling website — Apple / Airbnb / Stripe / Notion / Headspace — not a Google Forms / Typeform clone."

Every decision prioritizes:
- **Human connection** over form efficiency
- **Completion** over data collection volume
- **Trust** over convenience
- **Accessibility** over visual wow-factor
- **Performance** over framework complexity

---

**Last Updated:** May 31, 2026  
**Repository:** https://github.com/davidfrancisloretta/GeorgeManjuSurvey