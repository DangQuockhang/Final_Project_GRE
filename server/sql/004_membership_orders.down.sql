-- Refuse a destructive downgrade once the new business states are in use.
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM orders WHERE status='RETURNED' OR payment_status='REFUNDED') THEN
  RAISE EXCEPTION 'Rollback blocked: returned/refunded orders exist. Keep this version or restore a reviewed backup; never rewrite financial history.';
 END IF;
 IF to_regclass('public.rollback_004_membership_tiers') IS NOT NULL OR to_regclass('public.rollback_004_order_action_audit') IS NOT NULL THEN
  RAISE EXCEPTION 'Archived migration 004 tables already exist';
 END IF;
END $$;
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK(status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'));
ALTER TABLE orders DROP CONSTRAINT orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK(payment_status IN ('UNPAID','AWAITING_TRANSFER','PAID','REFUND_PENDING'));
ALTER TABLE membership_tiers RENAME TO rollback_004_membership_tiers;
ALTER TABLE order_action_audit RENAME TO rollback_004_order_action_audit;
DROP INDEX IF EXISTS membership_completed_orders_idx;
