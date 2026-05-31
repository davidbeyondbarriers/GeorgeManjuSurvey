# Architecture — George & Manju Survey

## Why this layout exists

The repo is a **single-package monorepo**: one `package.json` at the root, all
layers share the same `node_modules`. Each top-level folder owns one concern and
nothing else.

---

## `frontend/`

**What:** The Vite SPA — every file the browser ever touches.

**Why separate:** The frontend and backend have different deployment targets
(Cloudflare Workers CDN vs. AWS ECS Fargate). Keeping them in separate folders
means `vite build` has a clean scope (`root: 'frontend'`) and the Docker
production stage can `COPY backend/src` without pulling in any frontend source.
The frontend has zero awareness of the backend except for the four API endpoints
called fire-and-forget from `persistence/autosave.js`.

**Key files:**
- `frontend/src/main.js` — boot order: hero paint → Three.js scene → survey engine
- `frontend/src/data/survey.json` — single source of truth for all questions and adaptive rules
- `frontend/src/persistence/autosave.js` — localStorage autosave + API calls

---

## `backend/`

**What:** The Express API and PostgreSQL migration layer.

**Why separate:** The backend runs in Node.js with server-only dependencies
(`pg`, `express`, `helmet`, `cors`, `zod`). Separating it from the frontend
makes the Docker production stage explicit: copy `backend/` and `dist/`, nothing
else. Tests live inside `backend/tests/` so the import paths are short and the
test scope is obvious (`../src/server.js`).

**Design contract:** All four endpoints return `202 Accepted` immediately; the
DB write is async (fire-and-forget). This means the survey never stalls waiting
for a network call, and tests can verify the 202 contract without a running
database.

**Key files:**
- `backend/src/server.js` — Express app, runs migrations on startup, serves `dist/` in production
- `backend/src/db/client.js` — single `pg.Pool` instance, shared across all routes
- `backend/db/migrations/` — plain SQL files, run in order by `migrate.js`

---

## `infrastructure/`

**What:** Everything needed to run or deploy the stack — Docker, Cloudflare
Workers, and the archived Netlify setup.

**Why separate:** Infrastructure files are operated by different people
(DevOps, deployment scripts) at different cadences from the application code.
Keeping them out of the root reduces cognitive load when working on features.

### `infrastructure/docker/`

The `Dockerfile` uses three stages:
1. **dev** — nodemon hot-reload; used by `docker-compose.yml` via volume mounts
2. **build** — runs `npm run build` (Vite); output is `dist/`
3. **production** — slim Alpine, copies only `backend/` and `dist/`

`docker-compose.yml` uses `context: ../..` (project root) so all `COPY`
statements in the Dockerfile resolve correctly.

### `infrastructure/cloudflare/`

`wrangler.toml` points `assets.directory` to `../../dist` — the Vite output at
the project root. `worker.js` adds security and cache headers; it never handles
`/api/*` routes (those go to ECS).

### `infrastructure/netlify-archive/`

The original broken Netlify setup. Kept as a reference — the `@netlify/database`
import and the missing API routes were the root cause of the original production
failure. Do not use.

---

## `docs/`

**What:** Human-readable documentation that lives alongside the code.

**Why not in root:** The root is for files that tools need (`package.json`,
`vite.config.js`, `.env.example`). Long-form documentation belongs in `docs/`
where it can be organised by audience without cluttering the root.

- `docs/specifications/backend.md` — the API contract (source of truth for the
  backend layer; written before implementation, spec-first)
- `docs/requirements/` — survey brief, stakeholder goals
- `docs/architecture/` — ADRs, design decisions
- `docs/deployment/` — runbooks, environment setup guides

---

## `assets/`

**What:** Source documents, brand images, research materials — the inputs that
informed the build.

**Why separate from `frontend/public/`:** `frontend/public/` is served by Vite
(Cloudflare CDN in production). `assets/` is not served — it is source-of-truth
storage for brand files and research documents. The working copies in
`frontend/public/assets/` are optimised for serving; these are the originals.

---

## `dist/` (gitignored)

Vite build output. Created by `npm run build`. Referenced by:
- `backend/src/server.js` — serves it in production via `express.static()`
- `infrastructure/cloudflare/wrangler.toml` — uploaded as Cloudflare Workers Assets

---

## Data flow

```
Browser
  └─ Cloudflare CDN (Workers Assets)
       └─ frontend/dist/           ← static HTML/JS/CSS
            └─ fetch /api/*        ← fire-and-forget (202 pattern)
                 └─ AWS ECS Fargate
                      └─ backend/src/server.js
                           └─ pg.Pool → AWS RDS PostgreSQL 16
```

In local development:
```
npm run dev  (Vite, port 5200)
  └─ /api/* proxied to localhost:3000
       └─ npm run api:dev  (nodemon, port 3000)
            └─ DATABASE_URL → Docker postgres:16-alpine (port 5432)
```

---

## Decisions not to make

- **No npm workspaces.** Frontend and backend share `node_modules` and a single
  lock file. The build is tightly coupled (backend serves `dist/`); splitting
  packages would add complexity with no benefit at this scale.

- **No TypeScript.** Consistent with the existing frontend codebase. Zod
  provides runtime validation at the API boundary where it matters most.

- **No ORM.** Raw `pg` queries are explicit, fast, and require no schema
  synchronisation step. The SQL in `backend/db/migrations/` is the schema —
  no models, no magic.
