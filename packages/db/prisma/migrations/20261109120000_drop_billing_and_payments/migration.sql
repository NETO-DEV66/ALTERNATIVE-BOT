-- Alternative Bot is free and BYOK-only: the subscription, credit, referral and
-- purchase systems are removed entirely.

-- Triggers and functions that only served the removed billing journal.
DROP TRIGGER IF EXISTS usage_audit_revision ON usage_records;
DROP TRIGGER IF EXISTS usage_audit_write ON usage_records;
DROP TRIGGER IF EXISTS credit_audit_revision ON model_credit_entries;
DROP TRIGGER IF EXISTS credit_audit_write ON model_credit_entries;
DROP TRIGGER IF EXISTS credit_identity_immutable ON model_credit_entries;
DROP TRIGGER IF EXISTS credit_audit_account_closed ON model_credit_accounts;
DROP TRIGGER IF EXISTS lot_audit_revision ON model_credit_lots;
DROP TRIGGER IF EXISTS lot_audit_write ON model_credit_lots;
DROP TRIGGER IF EXISTS billing_audit_no_mutation ON billing_audit_events;

DROP FUNCTION IF EXISTS billing_audit_revision();
DROP FUNCTION IF EXISTS billing_audit_usage();
DROP FUNCTION IF EXISTS billing_audit_credit();
DROP FUNCTION IF EXISTS billing_audit_account_closed();
DROP FUNCTION IF EXISTS billing_audit_lot();
DROP FUNCTION IF EXISTS billing_credit_identity_immutable();
DROP FUNCTION IF EXISTS billing_audit_immutable();

DROP TABLE IF EXISTS "model_credit_entries";
DROP TABLE IF EXISTS "model_credit_lots";
DROP TABLE IF EXISTS "model_credit_accounts";
DROP TABLE IF EXISTS "billing_audit_events";
DROP TABLE IF EXISTS "payment_wallets";
DROP TABLE IF EXISTS "purchases";
DROP TABLE IF EXISTS "billing_accounts";
DROP TABLE IF EXISTS "billing_card_fingerprints";
DROP TABLE IF EXISTS "referrals";
DROP TABLE IF EXISTS "referral_codes";

ALTER TABLE "deployment_settings" DROP COLUMN IF EXISTS "model_credits_enabled";
