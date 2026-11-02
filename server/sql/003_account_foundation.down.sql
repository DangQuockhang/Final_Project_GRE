-- Stop the API before rollback. Preserve addresses and revocations for re-apply.
-- Revoke every old session: the previous API does not consult the revocation table.
UPDATE users SET token_version=token_version+1,updated_at=now();
ALTER TABLE account_default_addresses RENAME TO rollback_003_account_default_addresses;
ALTER TABLE auth_revoked_tokens RENAME TO rollback_003_auth_revoked_tokens;
DROP INDEX IF EXISTS orders_user_created_idx;
