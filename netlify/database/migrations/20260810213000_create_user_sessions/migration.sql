CREATE TABLE user_sessions (
    token_hash CHAR(64) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    session_version INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_sessions_pk PRIMARY KEY (token_hash),
    CONSTRAINT user_sessions_token_hash_format
        CHECK (token_hash ~ '^[a-f0-9]{64}$'),
    CONSTRAINT user_sessions_version_positive
        CHECK (session_version > 0),
    CONSTRAINT user_sessions_user_fk
        FOREIGN KEY (user_id)
        REFERENCES "YongHuDengLuXingXi" ("用户ID")
        ON DELETE CASCADE
);

CREATE INDEX user_sessions_user_id_idx
    ON user_sessions (user_id);

CREATE INDEX user_sessions_expires_at_idx
    ON user_sessions (expires_at);
