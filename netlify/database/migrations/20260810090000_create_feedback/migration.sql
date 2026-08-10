CREATE TABLE shujufankui (
    id UUID PRIMARY KEY,
    contact_name VARCHAR(50) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    email VARCHAR(254) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    image_attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    submission_state VARCHAR(16) NOT NULL DEFAULT 'draft',
    upload_token_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    CONSTRAINT shujufankui_attachments_array
        CHECK (jsonb_typeof(image_attachments) = 'array'),
    CONSTRAINT shujufankui_submission_state
        CHECK (submission_state IN ('draft', 'submitted')),
    CONSTRAINT shujufankui_submission_dates
        CHECK (
            (submission_state = 'draft' AND submitted_at IS NULL)
            OR
            (submission_state = 'submitted' AND submitted_at IS NOT NULL)
        )
);

CREATE INDEX shujufankui_submitted_at_idx
    ON shujufankui (submitted_at DESC)
    WHERE submission_state = 'submitted';

CREATE INDEX shujufankui_draft_cleanup_idx
    ON shujufankui (created_at)
    WHERE submission_state = 'draft';
