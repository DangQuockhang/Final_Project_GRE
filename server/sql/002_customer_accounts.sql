-- Additive Sprint 1 migration, executed by db:init inside a transaction.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
-- Do not merge accounts silently if a legacy database has case-only duplicates.
DO $$ BEGIN
 IF EXISTS(SELECT lower(trim(email)) FROM users GROUP BY lower(trim(email)) HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Duplicate normalized emails: resolve these accounts before applying account migration.';
 END IF;
END $$;
UPDATE users SET email=lower(trim(email)) WHERE email<>lower(trim(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_unique ON users(lower(email));
CREATE TABLE IF NOT EXISTS password_reset_tokens(
 id BIGSERIAL PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash CHAR(64) NOT NULL UNIQUE,
 token_version INTEGER NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_tokens(user_id);
CREATE TABLE IF NOT EXISTS auth_rate_limits(
 key_hash CHAR(64) PRIMARY KEY,
 hits INTEGER NOT NULL DEFAULT 1,
 expires_at TIMESTAMPTZ NOT NULL
);
