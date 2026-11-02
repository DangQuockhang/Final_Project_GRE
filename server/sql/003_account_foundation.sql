-- Additive migration. Restore archived tables if this migration was rolled back.
DO $$
BEGIN
 IF to_regclass('public.rollback_003_account_default_addresses') IS NOT NULL THEN
  IF to_regclass('public.account_default_addresses') IS NOT NULL THEN
   RAISE EXCEPTION 'Both active and archived address tables exist; reconcile before migrating.';
  END IF;
  ALTER TABLE rollback_003_account_default_addresses RENAME TO account_default_addresses;
 END IF;
 IF to_regclass('public.rollback_003_auth_revoked_tokens') IS NOT NULL THEN
  IF to_regclass('public.auth_revoked_tokens') IS NOT NULL THEN
   RAISE EXCEPTION 'Both active and archived revocation tables exist; reconcile before migrating.';
  END IF;
  ALTER TABLE rollback_003_auth_revoked_tokens RENAME TO auth_revoked_tokens;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS account_default_addresses(
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 recipient VARCHAR(120) NOT NULL CHECK(char_length(recipient) BETWEEN 2 AND 120),
 phone VARCHAR(20) NOT NULL CHECK(phone ~ '^\+?[0-9]{8,15}$'),
 address VARCHAR(750) NOT NULL CHECK(char_length(address) BETWEEN 10 AND 750),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_revoked_tokens(
 token_hash CHAR(64) PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_revoked_tokens_expiry_idx ON auth_revoked_tokens(expires_at);
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders(user_id,created_at DESC,id DESC);
