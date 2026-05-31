-- George & Manju Post-Traumatic Growth Survey
-- Complete schema migration — fully idempotent, safe to re-run
-- Netlify applies this automatically on each deploy against the managed Postgres instance

-- ── EXTENSIONS ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── TABLES ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS survey_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token    TEXT        NOT NULL UNIQUE,
  device_type      TEXT        CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  browser          TEXT,
  os               TEXT,
  screen_width     INTEGER,
  screen_height    INTEGER,
  language         TEXT,
  referrer         TEXT,
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  status           TEXT        NOT NULL DEFAULT 'started'
                               CHECK (status IN ('started', 'in_progress', 'completed', 'abandoned')),
  current_chapter  TEXT,
  current_question TEXT,
  progress_pct     NUMERIC(5,2) DEFAULT 0,
  estimated_time_s INTEGER,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  completion_time_s INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        NOT NULL REFERENCES survey_sessions(id) ON DELETE CASCADE,
  question_id      TEXT        NOT NULL,
  question_text    TEXT,
  question_type    TEXT        NOT NULL
                               CHECK (question_type IN (
                                 'single_choice', 'multiple_choice', 'likert', 'rating',
                                 'short_text', 'long_text', 'dropdown', 'date', 'boolean'
                               )),
  chapter_id       TEXT,
  chapter_title    TEXT,
  answer_value     TEXT,
  answer_label     TEXT,
  answer_numeric   NUMERIC,
  answer_array     TEXT[],
  is_skipped       BOOLEAN     NOT NULL DEFAULT false,
  time_to_answer_s INTEGER,
  revision_count   SMALLINT    DEFAULT 0,
  answered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        REFERENCES survey_sessions(id) ON DELETE SET NULL,
  event_name   TEXT        NOT NULL
               CHECK (event_name IN (
                 'survey_start', 'chapter_view', 'question_view', 'question_answer',
                 'question_skip', 'drop_off', 'survey_complete', 'completion_time',
                 'device_type', 'page_focus', 'page_blur', 'resume'
               )),
  properties   JSONB,
  chapter_id   TEXT,
  question_id  TEXT,
  fired_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_quality_flags (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES survey_sessions(id) ON DELETE CASCADE,
  response_id   UUID        REFERENCES survey_responses(id) ON DELETE CASCADE,
  flag_type     TEXT        NOT NULL
                CHECK (flag_type IN (
                  'too_fast', 'straight_lining', 'all_skipped',
                  'incomplete_story', 'duplicate_session', 'bot_suspected'
                )),
  severity      TEXT        NOT NULL DEFAULT 'warning'
                CHECK (severity IN ('info', 'warning', 'critical')),
  detail        TEXT,
  auto_excluded BOOLEAN     DEFAULT false,
  reviewed      BOOLEAN     DEFAULT false,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sessions_status      ON survey_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at  ON survey_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_device_type ON survey_sessions(device_type);

CREATE INDEX IF NOT EXISTS idx_responses_session_id   ON survey_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_id  ON survey_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_chapter_id   ON survey_responses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_type ON survey_responses(question_type);

CREATE INDEX IF NOT EXISTS idx_events_session_id  ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name  ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_fired_at    ON analytics_events(fired_at);

CREATE INDEX IF NOT EXISTS idx_flags_session_id ON data_quality_flags(session_id);
CREATE INDEX IF NOT EXISTS idx_flags_flag_type  ON data_quality_flags(flag_type);

-- ── TRIGGER FUNCTIONS ─────────────────────────────────────────────────────────

-- 1. Keep updated_at current on every session update
CREATE OR REPLACE FUNCTION fn_auto_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Advance session status and last_active_at whenever an answer is saved
CREATE OR REPLACE FUNCTION fn_auto_set_last_active()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE survey_sessions
  SET
    last_active_at = now(),
    status = CASE WHEN status = 'started' THEN 'in_progress' ELSE status END
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- 3. Compute completion_time_s when status flips to 'completed'
CREATE OR REPLACE FUNCTION fn_auto_completion_time()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at      = COALESCE(NEW.completed_at, now());
    NEW.completion_time_s = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Auto-flag suspiciously fast answers on long-form / rated questions
CREATE OR REPLACE FUNCTION fn_auto_flag_too_fast()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.time_to_answer_s IS NOT NULL
     AND NEW.time_to_answer_s < 2
     AND NEW.question_type IN ('long_text', 'likert', 'rating')
  THEN
    INSERT INTO data_quality_flags (session_id, response_id, flag_type, severity, detail)
    VALUES (
      NEW.session_id,
      NEW.id,
      'too_fast',
      'warning',
      'Answer submitted in ' || NEW.time_to_answer_s || 's for question type ' || NEW.question_type
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ── TRIGGERS ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_auto_update_updated_at ON survey_sessions;
CREATE TRIGGER trg_auto_update_updated_at
  BEFORE UPDATE ON survey_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_auto_update_updated_at();

DROP TRIGGER IF EXISTS trg_auto_set_last_active ON survey_responses;
CREATE TRIGGER trg_auto_set_last_active
  AFTER INSERT ON survey_responses
  FOR EACH ROW EXECUTE FUNCTION fn_auto_set_last_active();

DROP TRIGGER IF EXISTS trg_auto_completion_time ON survey_sessions;
CREATE TRIGGER trg_auto_completion_time
  BEFORE UPDATE ON survey_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_auto_completion_time();

DROP TRIGGER IF EXISTS trg_auto_flag_too_fast ON survey_responses;
CREATE TRIGGER trg_auto_flag_too_fast
  AFTER INSERT ON survey_responses
  FOR EACH ROW EXECUTE FUNCTION fn_auto_flag_too_fast();

-- ── ANALYTICS VIEWS ───────────────────────────────────────────────────────────

-- Overall completion stats by device and day
CREATE OR REPLACE VIEW v_completion_stats AS
SELECT
  device_type,
  DATE_TRUNC('day', started_at)                                            AS day,
  COUNT(*)                                                                  AS total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed')                             AS completed,
  COUNT(*) FILTER (WHERE status = 'abandoned')                             AS abandoned,
  COUNT(*) FILTER (WHERE status = 'in_progress')                          AS in_progress,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0), 2
  )                                                                         AS completion_rate_pct,
  ROUND(AVG(completion_time_s) FILTER (WHERE status = 'completed'), 0)    AS avg_completion_time_s,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY completion_time_s
  ) FILTER (WHERE status = 'completed')                                    AS median_completion_time_s
FROM survey_sessions
GROUP BY device_type, DATE_TRUNC('day', started_at);

-- Per-question performance — skip rates, timing, most common answer
CREATE OR REPLACE VIEW v_question_performance AS
SELECT
  r.question_id,
  r.question_text,
  r.question_type,
  r.chapter_id,
  COUNT(*)                                                   AS total_answers,
  COUNT(*) FILTER (WHERE r.is_skipped)                      AS skipped_count,
  ROUND(COUNT(*) FILTER (WHERE r.is_skipped) * 100.0 / NULLIF(COUNT(*), 0), 2)
                                                             AS skip_rate_pct,
  ROUND(AVG(r.time_to_answer_s) FILTER (WHERE NOT r.is_skipped), 1)
                                                             AS avg_time_to_answer_s,
  ROUND(AVG(r.answer_numeric)   FILTER (WHERE r.answer_numeric IS NOT NULL), 2)
                                                             AS avg_answer_numeric,
  MODE() WITHIN GROUP (ORDER BY r.answer_label)             AS most_common_answer_label
FROM survey_responses r
GROUP BY r.question_id, r.question_text, r.question_type, r.chapter_id;

-- Chapter-by-chapter drop-off funnel
CREATE OR REPLACE VIEW v_chapter_drop_off AS
WITH chapter_reach AS (
  SELECT
    chapter_id,
    COUNT(DISTINCT session_id) AS sessions_reached
  FROM survey_responses
  GROUP BY chapter_id
),
chapter_complete AS (
  SELECT
    s.current_chapter,
    COUNT(DISTINCT s.id) AS sessions_completed_chapter
  FROM survey_sessions s
  WHERE s.status IN ('completed', 'in_progress')
  GROUP BY s.current_chapter
)
SELECT
  cr.chapter_id,
  cr.sessions_reached,
  COALESCE(cc.sessions_completed_chapter, 0)                               AS sessions_advanced,
  cr.sessions_reached - COALESCE(cc.sessions_completed_chapter, 0)        AS drop_off_count,
  ROUND(
    (cr.sessions_reached - COALESCE(cc.sessions_completed_chapter, 0))
    * 100.0 / NULLIF(cr.sessions_reached, 0), 2
  )                                                                         AS drop_off_rate_pct
FROM chapter_reach cr
LEFT JOIN chapter_complete cc ON cc.current_chapter = cr.chapter_id
ORDER BY cr.chapter_id;

-- Clean dataset — excludes sessions auto-flagged as low quality
CREATE OR REPLACE VIEW v_clean_responses AS
SELECT
  r.*,
  s.device_type,
  s.browser,
  s.os,
  s.started_at,
  s.completed_at,
  s.completion_time_s,
  s.status
FROM survey_responses r
JOIN survey_sessions s ON s.id = r.session_id
WHERE
  s.id NOT IN (
    SELECT DISTINCT session_id
    FROM data_quality_flags
    WHERE auto_excluded = true
  );

-- Daily activity dashboard
CREATE OR REPLACE VIEW v_daily_activity AS
SELECT
  DATE_TRUNC('day', started_at)                                            AS day,
  COUNT(*)                                                                  AS new_sessions,
  COUNT(*) FILTER (WHERE status = 'completed')                             AS completions,
  COUNT(*) FILTER (WHERE status IN ('started', 'in_progress', 'completed')) AS active_sessions,
  ROUND(AVG(progress_pct), 1)                                              AS avg_progress_pct
FROM survey_sessions
GROUP BY DATE_TRUNC('day', started_at)
ORDER BY day DESC;

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────────────────────

ALTER TABLE survey_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_flags ENABLE ROW LEVEL SECURITY;

-- Create roles if they don't exist (wrapped so migration succeeds without CREATEROLE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- anon: INSERT only — the browser can write its own data, never read others
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT INSERT ON survey_sessions    TO anon;
    GRANT INSERT ON survey_responses   TO anon;
    GRANT INSERT ON analytics_events   TO anon;
  END IF;
END;
$$;

-- service_role: full access for admin and analytics tooling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON survey_sessions    TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON survey_responses   TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_events   TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON data_quality_flags TO service_role;
    GRANT SELECT ON v_completion_stats   TO service_role;
    GRANT SELECT ON v_question_performance TO service_role;
    GRANT SELECT ON v_chapter_drop_off   TO service_role;
    GRANT SELECT ON v_clean_responses    TO service_role;
    GRANT SELECT ON v_daily_activity     TO service_role;
  END IF;
END;
$$;

-- RLS policies: each session can only write its own rows (keyed by session_token in app layer)
DROP POLICY IF EXISTS pol_anon_insert_sessions    ON survey_sessions;
DROP POLICY IF EXISTS pol_anon_insert_responses   ON survey_responses;
DROP POLICY IF EXISTS pol_anon_insert_events      ON analytics_events;
DROP POLICY IF EXISTS pol_service_all_sessions    ON survey_sessions;
DROP POLICY IF EXISTS pol_service_all_responses   ON survey_responses;
DROP POLICY IF EXISTS pol_service_all_events      ON analytics_events;
DROP POLICY IF EXISTS pol_service_all_flags       ON data_quality_flags;

CREATE POLICY pol_anon_insert_sessions  ON survey_sessions    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY pol_anon_insert_responses ON survey_responses   FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY pol_anon_insert_events    ON analytics_events   FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY pol_service_all_sessions  ON survey_sessions    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pol_service_all_responses ON survey_responses   TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pol_service_all_events    ON analytics_events   TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pol_service_all_flags     ON data_quality_flags TO service_role USING (true) WITH CHECK (true);
