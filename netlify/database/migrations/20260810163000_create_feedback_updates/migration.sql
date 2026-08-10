CREATE TABLE feedback_updates (
    id UUID PRIMARY KEY,
    source_feedback_id UUID NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    summary VARCHAR(1000) NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feedback_updates_title_length
        CHECK (char_length(title) BETWEEN 2 AND 100),
    CONSTRAINT feedback_updates_summary_length
        CHECK (char_length(summary) BETWEEN 10 AND 1000)
);

CREATE INDEX feedback_updates_published_at_idx
    ON feedback_updates (published_at DESC, id DESC);

CREATE TABLE feedback_blob_cleanup_queue (
    blob_key TEXT PRIMARY KEY,
    source_feedback_id UUID NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feedback_blob_cleanup_attempts
        CHECK (attempts >= 0)
);

CREATE INDEX feedback_blob_cleanup_retry_idx
    ON feedback_blob_cleanup_queue (next_attempt_at, created_at);
