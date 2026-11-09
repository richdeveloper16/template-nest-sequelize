CREATE TABLE public.users (
    user_id SERIAL PRIMARY KEY,
    fk_person INTEGER NOT NULL,
    fk_user_type INTEGER,
    username VARCHAR(50) NOT NULL,
    password TEXT NOT NULL,
    last_login TIMESTAMPTZ(6),
    failed_attempts SMALLINT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    locked_until TIMESTAMPTZ(6),
    status BOOLEAN NOT NULL DEFAULT TRUE,
    registration_date TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_date TIMESTAMPTZ(6),
    CONSTRAINT uk_users_person UNIQUE (fk_person),
    CONSTRAINT uk_users_username UNIQUE (username)
);

CREATE INDEX idx_users_status ON public.users (status);
CREATE INDEX idx_users_user_type ON public.users (fk_user_type);

CREATE TABLE public.audit_log (
    audit_log_id BIGSERIAL PRIMARY KEY,
    fk_user INTEGER,
    action VARCHAR(30) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    "values" JSONB,
    error_values JSONB,
    ip_address INET,
    user_agent TEXT,
    registration_date TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_date ON public.audit_log (registration_date DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log (entity_name, entity_id);
CREATE INDEX idx_audit_log_user ON public.audit_log (fk_user);
