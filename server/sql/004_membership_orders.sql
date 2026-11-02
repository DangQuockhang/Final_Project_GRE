-- Additive upgrade. Never infer that an old COD order has already been paid.
DO $$
BEGIN
 IF to_regclass('public.rollback_004_membership_tiers') IS NOT NULL THEN
  IF to_regclass('public.membership_tiers') IS NOT NULL OR to_regclass('public.order_action_audit') IS NOT NULL THEN
   RAISE EXCEPTION 'Both live and archived membership tables exist';
  END IF;
  ALTER TABLE rollback_004_membership_tiers RENAME TO membership_tiers;
  ALTER TABLE rollback_004_order_action_audit RENAME TO order_action_audit;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS membership_tiers(
 code VARCHAR(20) PRIMARY KEY,
 name VARCHAR(40) NOT NULL,
 rank SMALLINT NOT NULL UNIQUE CHECK(rank BETWEEN 1 AND 5),
 min_spend BIGINT NOT NULL UNIQUE CHECK(min_spend>=0 AND min_spend<=9007199254740991),
 benefits JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(benefits)='array')
);
INSERT INTO membership_tiers(code,name,rank,min_spend) VALUES
 ('bronze','Đồng',1,0),('silver','Bạc',2,2000000),('gold','Vàng',3,5000000),
 ('diamond','Kim cương',4,15000000),('platinum','Platinum',5,30000000)
 ON CONFLICT(code) DO NOTHING;
CREATE TABLE IF NOT EXISTS order_action_audit(
 id BIGSERIAL PRIMARY KEY,
 order_id INTEGER NOT NULL REFERENCES orders(id),
 actor_id INTEGER NOT NULL REFERENCES users(id),
 action VARCHAR(24) NOT NULL CHECK(action IN ('STATUS','PAYMENT','RETURN','REFUND')),
 reason VARCHAR(500) NOT NULL,
 reference VARCHAR(120),
 restocked BOOLEAN NOT NULL DEFAULT false,
 before_state JSONB NOT NULL,
 after_state JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_action_audit_order_idx ON order_action_audit(order_id,id DESC);
CREATE INDEX IF NOT EXISTS membership_completed_orders_idx ON orders(user_id) INCLUDE(total)
 WHERE status='DELIVERED' AND payment_status='PAID';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK(status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','RETURNED'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK(payment_status IN ('UNPAID','AWAITING_TRANSFER','PAID','REFUND_PENDING','REFUNDED'));
