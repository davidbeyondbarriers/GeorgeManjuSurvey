-- Migration 001: Initial survey schema
-- Tables: sessions, responses, events

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

CREATE TABLE events (
  id            SERIAL          PRIMARY KEY,
  session_token UUID            NOT NULL,
  event_name    VARCHAR(100)    NOT NULL,
  properties    JSONB,
  chapter_id    VARCHAR(100),
  question_id   VARCHAR(100),
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Indexes — cover the access patterns used by the API and Adminer queries
CREATE INDEX idx_sessions_token   ON sessions  (session_token);
CREATE INDEX idx_sessions_status  ON sessions  (status);
CREATE INDEX idx_sessions_expires ON sessions  (expires_at);
CREATE INDEX idx_responses_token  ON responses (session_token);
CREATE INDEX idx_responses_qid    ON responses (question_id);
CREATE INDEX idx_events_token     ON events    (session_token);
CREATE INDEX idx_events_name      ON events    (event_name);
CREATE INDEX idx_events_created   ON events    (created_at);
