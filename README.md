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
├── CLAUDE.md                        # Project instructions for Claude Code
├── README.md
├── TREE.md                          # Full file tree (generated)
├── ARCHITECTURE.md                  # Why each top-level folder exists
├── package.json                     # Root package — scripts for all layers
├── vite.config.js                   # Vite config — root: frontend/, outDir: dist/
├── .env.example                     # All env vars documented
│
├── frontend/                        # Vite SPA — everything the browser loads
│   ├── index.html
│   ├── preview.html
│   ├── public/assets/               # Static assets served as-is
│   └── src/
│       ├── main.js                  # Boot sequence (hero → motivation → survey)
│       ├── data/survey.json         # Survey questions, adaptive rules, config
│       ├── engine/                  # Core render, state, skip logic, navigation
│       ├── components/              # Hero, chapter-intro, question types, progress, celebration
│       ├── analytics/track.js       # Event tracking wrapper (PostHog ready)
│       ├── persistence/autosave.js  # localStorage autosave + API fire-and-forget calls
│       ├── styles/                  # tokens.css, base.css, components.css, animations.css
│       └── three/hero-scene.js      # WebGL aurora borealis — GLSL shaders + star field
│
├── backend/                         # Express API + database layer
│   ├── src/
│   │   ├── server.js                # Express app — migrations on start, serves dist/ in prod
│   │   ├── db/client.js             # pg.Pool
│   │   └── routes/                  # session.js, response.js, event.js
│   ├── db/
│   │   ├── migrate.js               # Migration runner (also: node backend/db/migrate.js)
│   │   ├── seed.js                  # Sample data for Adminer verification
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   └── tests/
│       ├── api.contract.test.js     # 14 tests — valid payloads → 202
│       ├── validation.test.js       # 19 tests — bad payloads → 400
│       └── db.test.js               # 11 tests — DB persistence (auto-skip without DB)
│
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile               # 3-stage: dev (nodemon) / build (Vite) / production (slim)
│   │   ├── docker-compose.yml       # Local: DB + API (hot-reload) + Adminer
│   │   └── docker-compose.prod.yml  # AWS ECS/RDS reference sketch
│   ├── cloudflare/
│   │   ├── worker.js                # Security headers + asset cache
│   │   └── wrangler.toml            # Worker name, assets dir → ../../dist
│   └── netlify-archive/             # Legacy (broken) — kept for reference only
│
├── docs/
│   ├── specifications/backend.md    # Full API contract, schema, auth model, NFRs
│   ├── requirements/                # (placeholder)
│   ├── architecture/                # (placeholder)
│   └── deployment/                  # (placeholder)
│
└── assets/                          # Source materials — not built, not served
    ├── brand/                       # George_P.png, Manju_P.png, george-manju.png
    └── documents/                   # Post_Traumatic_Growth_Survey.docx, TraumaSurvey_Template_v1.xlsx
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

## Local Development (Docker)

```bash
# 1. Copy and edit the environment file
cp .env.example .env

# 2. Start the full stack — DB + API (hot-reload) + Adminer
docker compose -f infrastructure/docker/docker-compose.yml up

# 3. Start the Vite frontend dev server in a second terminal
npm run dev
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5200 |
| API | http://localhost:3000 |
| Adminer (DB GUI) | http://localhost:8080 |

Adminer login: **System:** PostgreSQL · **Server:** `db` · **User:** `survey` · **Password:** `survey` · **Database:** `survey`

Migrations run automatically when the API container starts.

To seed sample data: `DATABASE_URL=postgres://survey:survey@localhost:5432/survey npm run seed`.

---

## Testing

```bash
# Contract + validation tests (no DB required)
npm test

# With DB (requires docker compose up):
DATABASE_URL=postgres://survey:survey@localhost:5432/survey npm test
```

Test files:
- `backend/tests/api.contract.test.js` — all 4 endpoints return 202 on valid payloads
- `backend/tests/validation.test.js` — malformed payloads return 400 with `fieldErrors`
- `backend/tests/db.test.js` — records are persisted correctly in PostgreSQL

---

## Deploy to AWS

This section contains exact commands. Set the four shell variables at the top once;
all subsequent commands reference them.

```bash
# ── One-time setup — run these first ──────────────────────────────────────────
export AWS_REGION=ap-south-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REPO=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/georgemanjusurvey-api
export DB_PASSWORD="replace-with-a-strong-password"
```

### 1. ECR — Container Registry

```bash
# Create the repository
aws ecr create-repository \
  --repository-name georgemanjusurvey-api \
  --region ${AWS_REGION}

# Authenticate Docker with ECR
aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build the production image and push
docker build -f infrastructure/docker/Dockerfile --target production -t georgemanjusurvey-api .
docker tag  georgemanjusurvey-api:latest ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest
```

### 2. RDS — PostgreSQL 16

```bash
# Create a DB subnet group first (replace subnet IDs with your private subnets)
aws rds create-db-subnet-group \
  --db-subnet-group-name georgemanjusurvey-subnet-group \
  --db-subnet-group-description "George Manju Survey DB" \
  --subnet-ids subnet-xxxxxxxxxxxxxxxxx subnet-yyyyyyyyyyyyyyyyy \
  --region ${AWS_REGION}

# Create the RDS instance (db.t3.micro = ~$15/month, sufficient for survey traffic)
aws rds create-db-instance \
  --db-instance-identifier georgemanjusurvey-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username survey \
  --master-user-password ${DB_PASSWORD} \
  --db-name survey \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxxxxxxxxxxxxxx \
  --db-subnet-group-name georgemanjusurvey-subnet-group \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --region ${AWS_REGION}

# Wait until RDS is available (~5 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier georgemanjusurvey-db \
  --region ${AWS_REGION}

# Get the RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier georgemanjusurvey-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region ${AWS_REGION}

# Store the connection string in Secrets Manager (used by ECS task)
export RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier georgemanjusurvey-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text --region ${AWS_REGION})

aws secretsmanager create-secret \
  --name georgemanjusurvey/database-url \
  --secret-string "postgres://survey:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/survey" \
  --region ${AWS_REGION}
```

### 3. IAM — ECS Task Execution Role

Skip this step if your account already has `ecsTaskExecutionRole`.

```bash
# Create the role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the managed policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

### 4. CloudWatch — Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/georgemanjusurvey-api \
  --region ${AWS_REGION}
```

### 5. ECS — Cluster + Task Definition + Service

```bash
# Create the cluster
aws ecs create-cluster \
  --cluster-name georgemanjusurvey \
  --region ${AWS_REGION}

# Get the secret ARN
export SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id georgemanjusurvey/database-url \
  --query ARN --output text --region ${AWS_REGION})

# Register the task definition
aws ecs register-task-definition \
  --family georgemanjusurvey-api \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 512 \
  --memory 1024 \
  --execution-role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole \
  --container-definitions "[
    {
      \"name\": \"api\",
      \"image\": \"${ECR_REPO}:latest\",
      \"portMappings\": [{\"containerPort\": 3000, \"protocol\": \"tcp\"}],
      \"environment\": [
        {\"name\": \"PORT\",      \"value\": \"3000\"},
        {\"name\": \"NODE_ENV\",  \"value\": \"production\"},
        {\"name\": \"CORS_ORIGIN\",\"value\": \"https://your-survey-domain.com\"}
      ],
      \"secrets\": [
        {\"name\": \"DATABASE_URL\", \"valueFrom\": \"${SECRET_ARN}\"}
      ],
      \"healthCheck\": {
        \"command\": [\"CMD-SHELL\", \"wget -qO- http://localhost:3000/api/health || exit 1\"],
        \"interval\": 30,
        \"timeout\": 5,
        \"retries\": 3,
        \"startPeriod\": 15
      },
      \"logConfiguration\": {
        \"logDriver\": \"awslogs\",
        \"options\": {
          \"awslogs-group\": \"/ecs/georgemanjusurvey-api\",
          \"awslogs-region\": \"${AWS_REGION}\",
          \"awslogs-stream-prefix\": \"ecs\"
        }
      }
    }
  ]" \
  --region ${AWS_REGION}

# Create the ECS service with an Application Load Balancer target group
# (create ALB and target group in the console first, or add them here)
aws ecs create-service \
  --cluster georgemanjusurvey \
  --service-name georgemanjusurvey-api \
  --task-definition georgemanjusurvey-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxxxxxxxxxxxxxxxx,subnet-yyyyyyyyyyyyyyyyy],
    securityGroups=[sg-xxxxxxxxxxxxxxxxx],
    assignPublicIp=ENABLED
  }" \
  --region ${AWS_REGION}
```

### 6. Run Migrations on First Deploy

After the ECS task starts for the first time, migrations run automatically (the API
server calls `runMigrations()` on startup). Verify by checking CloudWatch logs:

```bash
aws logs tail /ecs/georgemanjusurvey-api --follow --region ${AWS_REGION}
```

Look for: `[migrate] ✓ 001_initial_schema.sql` and `[migrate] All migrations up to date`.

### 7. Deploy Updates (push new image)

```bash
docker build -f infrastructure/docker/Dockerfile --target production -t georgemanjusurvey-api .
docker tag  georgemanjusurvey-api:latest ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest

aws ecs update-service \
  --cluster georgemanjusurvey \
  --service georgemanjusurvey-api \
  --force-new-deployment \
  --region ${AWS_REGION}
```

### Environment Variables

Create a `.env` file (not committed):

```env
# Copy .env.example and fill in values
cp .env.example .env
```

See `.env.example` for full documentation of every variable.

---

## Troubleshooting

**Port 5200 already in use**
Another process is holding 5200. Check with `netstat -ano | findstr :5200` and kill that process, or temporarily change the port in `vite.config.js`.

**Aurora not showing**
WebGL is unavailable in this browser — the CSS animated aurora fallback will show instead. Check the browser console for WebGL errors.

**Three.js not loading on mobile**
The hero scene gracefully degrades to the CSS aurora if WebGL fails. This is expected on some older or low-memory Android devices.

**Autosave not persisting**
Check localStorage is enabled in browser settings. Clear cache and retest. See `frontend/src/persistence/autosave.js`.

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
