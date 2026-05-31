# Backend Specification — George & Manju Survey API

## 1. Overview

The backend is a Node.js/Express HTTP API that persists survey sessions, question
responses, and analytics events from the frontend into a PostgreSQL database.

The frontend calls every endpoint in a fire-and-forget pattern — it never awaits a
response before continuing the survey flow. All endpoints MUST return `202 Accepted`
immediately; the DB write happens asynchronously after the response is sent.

---

## 2. API Contract

**Base path:** `/api`
**Content-Type:** `application/json` (all requests and responses)

### 2.1 POST /api/session

Creates a survey session. Called once when the survey starts (`initSession()` in
`src/persistence/autosave.js`).

**Request body:**
```json
{
  "session_token": "550e8400-e29b-41d4-a716-446655440000",
  "device_type":   "mobile",
  "browser":       "Chrome",
  "os":            "Android",
  "screen_width":  390,
  "screen_height": 844,
  "language":      "en-AU",
  "referrer":      "https://example.com",
  "utm_source":    "email",
  "utm_medium":    "newsletter",
  "utm_campaign":  "survey-launch-2026"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `session_token` | UUID string | Yes | Client-generated via `crypto.randomUUID()` |
| `device_type` | `"mobile"` \| `"tablet"` \| `"desktop"` | No | |
| `browser` | string ≤20 chars | No | |
| `os` | string ≤20 chars | No | |
| `screen_width` | integer | No | pixels |
| `screen_height` | integer | No | pixels |
| `language` | string ≤20 chars | No | BCP 47 |
| `referrer` | string ≤2048 chars | No | |
| `utm_source` | string ≤255 chars | No | |
| `utm_medium` | string ≤255 chars | No | |
| `utm_campaign` | string ≤255 chars | No | |

**Response:** `202 Accepted` — empty body
**Error:** `400 Bad Request` — `{ "error": { "fieldErrors": { "field": ["message"] } } }`

**DB behaviour:** `INSERT ... ON CONFLICT (session_token) DO NOTHING` — fully idempotent.

---

### 2.2 PATCH /api/session

Updates an existing session. Used for two purposes by `updateProgress()` and
`completeSession()` in `src/persistence/autosave.js`.

**Progress update shape:**
```json
{
  "session_token":    "550e8400-e29b-41d4-a716-446655440000",
  "current_chapter":  "ch_background",
  "current_question": "q_age",
  "progress_pct":     42.5,
  "estimated_time_s": 180
}
```

**Completion shape:**
```json
{
  "session_token": "550e8400-e29b-41d4-a716-446655440000",
  "status":        "completed",
  "completed_at":  "2026-05-31T10:30:00.000Z",
  "progress_pct":  100
}
```

| Field | Type | Notes |
|---|---|---|
| `session_token` | UUID string | Required — identifies which session to update |
| `status` | `"in_progress"` \| `"completed"` \| `"abandoned"` | Optional |
| `current_chapter` | string ≤100 | Optional |
| `current_question` | string ≤100 | Optional |
| `progress_pct` | number 0–100 | Optional |
| `estimated_time_s` | integer ≥0 | Optional |
| `completed_at` | ISO 8601 datetime | Optional |

**Response:** `202 Accepted` — empty body
**DB behaviour:** `UPDATE sessions SET ... WHERE session_token = $1`. Unknown/absent fields
are ignored. `updated_at` is always set to `NOW()`.

---

### 2.3 POST /api/response

Saves a single question answer. Called after every answered question (`saveResponse()`).

**Request body:**
```json
{
  "session_token":    "550e8400-e29b-41d4-a716-446655440000",
  "question_id":      "q_location",
  "question_text":    "Where do you currently live?",
  "question_type":    "single_choice",
  "chapter_id":       "ch_background",
  "chapter_title":    "Your Background",
  "answer_value":     "Melbourne",
  "answer_label":     null,
  "answer_numeric":   null,
  "answer_array":     null,
  "is_skipped":       false,
  "time_to_answer_s": 12,
  "revision_count":   0
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `session_token` | UUID string | Yes | |
| `question_id` | string ≤100 | Yes | Matches `id` in `survey.json` |
| `question_text` | string | No | Human-readable label |
| `question_type` | string ≤50 | No | `single_choice`, `rating`, etc. (underscore, not hyphen) |
| `chapter_id` | string ≤100 | No | |
| `chapter_title` | string ≤255 | No | |
| `answer_value` | string | No | Always a string; arrays are joined with comma |
| `answer_label` | string | No | Display label if different from stored value |
| `answer_numeric` | number | No | Filled for `rating` / `likert` questions |
| `answer_array` | array | No | Original array for multi-select, otherwise `null` |
| `is_skipped` | boolean | No | Default `false` |
| `time_to_answer_s` | integer ≥0 | No | Seconds from question render to answer |
| `revision_count` | integer ≥0 | No | Default `0` |

**Response:** `202 Accepted`
**DB behaviour:** `INSERT` — one row per call. Multiple revisions of the same question
produce multiple rows; `revision_count` tracks which revision it is.

---

### 2.4 POST /api/event

Logs a frontend analytics event. Called from `logEvent()` in `src/persistence/autosave.js`.

**Request body:**
```json
{
  "session_token": "550e8400-e29b-41d4-a716-446655440000",
  "event_name":    "chapter_view",
  "properties":    { "chapter": "ch_background", "chapter_index": 1 },
  "chapter_id":    "ch_background",
  "question_id":   null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `session_token` | UUID string | Yes | |
| `event_name` | string ≤100 | Yes | See event map below |
| `properties` | object | No | Arbitrary JSON bag |
| `chapter_id` | string ≤100 | No | Extracted from properties by frontend |
| `question_id` | string ≤100 | No | Extracted from properties by frontend |

**Known event names:** `survey_start` · `chapter_view` · `question_view` ·
`question_answer` · `question_skip` · `drop_off` · `survey_complete`

**Response:** `202 Accepted`

---

### 2.5 GET /api/health

Liveness probe for load balancers and ECS health checks.

**Response:** `200 OK`
```json
{ "status": "ok", "uptime": 3600 }
```

---

## 3. Database Schema

### 3.1 `sessions`

```sql
CREATE TABLE sessions (
  id               SERIAL          PRIMARY KEY,
  session_token    UUID            NOT NULL UNIQUE,
  status           VARCHAR(20)     NOT NULL DEFAULT 'in_progress',
  device_type      VARCHAR(10),
  browser          VARCHAR(20),
  os               VARCHAR(20),
  screen_width     INTEGER,
  screen_height    INTEGER,
  language         VARCHAR(20),
  referrer         TEXT,
  utm_source       VARCHAR(255),
  utm_medium       VARCHAR(255),
  utm_campaign     VARCHAR(255),
  current_chapter  VARCHAR(100),
  current_question VARCHAR(100),
  progress_pct     NUMERIC(5,2),
  estimated_time_s INTEGER,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW() + INTERVAL '90 days'
);
```

`status` values: `in_progress` | `completed` | `abandoned`

### 3.2 `responses`

```sql
CREATE TABLE responses (
  id               SERIAL          PRIMARY KEY,
  session_token    UUID            NOT NULL,
  question_id      VARCHAR(100)    NOT NULL,
  question_text    TEXT,
  question_type    VARCHAR(50),
  chapter_id       VARCHAR(100),
  chapter_title    VARCHAR(255),
  answer_value     TEXT,
  answer_label     TEXT,
  answer_numeric   NUMERIC,
  answer_array     JSONB,
  is_skipped       BOOLEAN         NOT NULL DEFAULT FALSE,
  time_to_answer_s INTEGER,
  revision_count   INTEGER         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
```

### 3.3 `events`

```sql
CREATE TABLE events (
  id            SERIAL          PRIMARY KEY,
  session_token UUID            NOT NULL,
  event_name    VARCHAR(100)    NOT NULL,
  properties    JSONB,
  chapter_id    VARCHAR(100),
  question_id   VARCHAR(100),
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
```

---

## 4. Auth Model

No user authentication. Sessions are identified by a UUID token (`session_token`)
generated client-side via `crypto.randomUUID()` and stored in `localStorage` under
the key `gm_session_token`. The token is included in the request body of every API
call — there are no headers, cookies, or Bearer tokens required.

Admin/data access goes via Adminer (local dev) or direct RDS access (production).
The survey API itself has no admin endpoints.

---

## 5. Data Retention

- `expires_at` is set to `NOW() + INTERVAL '90 days'` at session creation.
- Run this cleanup query on a schedule (nightly cron or AWS EventBridge):

  ```sql
  DELETE FROM sessions WHERE expires_at < NOW();
  ```

- Responses and events are NOT cascade-deleted — they remain for audit purposes
  until explicitly pruned.

---

## 6. Non-Functionals

| Property | Target | How |
|---|---|---|
| API p99 latency | < 100ms | 202 immediately; DB write is async |
| CORS | Configurable | `CORS_ORIGIN` env var; `*` in dev |
| Request body limit | 100 KB | Express default |
| Error format | `{ "error": { "fieldErrors": {...} } }` | Zod `.flatten()` |
| Health check | `GET /api/health` | Returns `{ status, uptime }` |
| DB pool | max 10 connections | `pg.Pool` config |
| Logging | Errors only to stdout | No PII in logs |

---

## 7. Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | `postgres://user:pass@host:5432/db` |
| `PORT` | No | `3000` | HTTP listen port |
| `NODE_ENV` | No | `development` | `production` disables stack traces in errors |
| `CORS_ORIGIN` | No | `*` | Set to survey domain in production |
| `VITE_API_URL` | Frontend only | `""` (same-origin) | Baked at Vite build time |
