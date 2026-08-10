CREATE TABLE "YongHuDengLuXingXi" (
    "用户ID" VARCHAR(32) NOT NULL,
    "密码" TEXT NOT NULL,
    "邮箱" VARCHAR(254) NOT NULL,
    account_status VARCHAR(16) NOT NULL DEFAULT 'active',
    session_version INTEGER NOT NULL DEFAULT 1,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT yonghu_login_user_id_pk PRIMARY KEY ("用户ID"),
    CONSTRAINT yonghu_login_user_id_format
        CHECK ("用户ID" ~ '^[a-z0-9_-]{4,32}$'),
    CONSTRAINT yonghu_login_account_status
        CHECK (account_status IN ('active', 'disabled')),
    CONSTRAINT yonghu_login_session_version
        CHECK (session_version > 0)
);

CREATE UNIQUE INDEX yonghu_login_email_unique_idx
    ON "YongHuDengLuXingXi" (LOWER("邮箱"));

CREATE INDEX yonghu_login_created_at_idx
    ON "YongHuDengLuXingXi" (created_at DESC);
