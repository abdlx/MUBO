CREATE TABLE IF NOT EXISTS tracks (
 id text PRIMARY KEY, title text NOT NULL, artist text NOT NULL, artist_ids text[] NOT NULL DEFAULT '{}',
 album text NOT NULL, album_id text NOT NULL, genres text[] NOT NULL DEFAULT '{}',
 duration double precision, release_year integer, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
 sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, event_id uuid NOT NULL UNIQUE,
 user_id text NOT NULL, session_id text NOT NULL, event_type text NOT NULL,
 track_id text, source text, surface text, listened_seconds double precision,
 completion_ratio double precision, recommendation_id uuid,
 model_version text, context jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS events_user_time ON events(user_id, occurred_at DESC);
CREATE TABLE IF NOT EXISTS impressions (
 id uuid PRIMARY KEY, user_id text NOT NULL, track_id text NOT NULL, surface text NOT NULL,
 model_version text NOT NULL, explanation text NOT NULL, features jsonb NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS track_affinity (
 user_id text NOT NULL, track_id text NOT NULL, score double precision NOT NULL DEFAULT 0,
 plays integer NOT NULL DEFAULT 0, skips integer NOT NULL DEFAULT 0,
 last_played timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, track_id)
);
CREATE TABLE IF NOT EXISTS artist_affinity (
 user_id text NOT NULL, artist_id text NOT NULL, score double precision NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, artist_id)
);
CREATE TABLE IF NOT EXISTS album_affinity (
 user_id text NOT NULL, album_id text NOT NULL, score double precision NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, album_id)
);
CREATE TABLE IF NOT EXISTS processing_state (name text PRIMARY KEY, last_sequence bigint NOT NULL DEFAULT 0);
INSERT INTO processing_state(name) VALUES ('taste') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS track_analysis (
 track_id text PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
 energy double precision, tempo double precision, mood text,
 analysis_version text NOT NULL DEFAULT 'metadata-1', analyzed_at timestamptz NOT NULL DEFAULT now()
);
