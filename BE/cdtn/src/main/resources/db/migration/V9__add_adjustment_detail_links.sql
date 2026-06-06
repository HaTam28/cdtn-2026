-- Link adjustment receipt/issue rows back to their source inventory audit detail.
ALTER TABLE goodsreceiptdetail
    ADD COLUMN IF NOT EXISTS inventory_audit_detail_id BIGINT;

ALTER TABLE goodsissuedetail
    ADD COLUMN IF NOT EXISTS inventory_audit_detail_id BIGINT;

-- Receipt adjustment rows must keep the auto-filled existing batch instead of creating a new batch code.
ALTER TABLE goodsreceiptdetail
    ADD COLUMN IF NOT EXISTS batchid BIGINT;

CREATE INDEX IF NOT EXISTS idx_goodsreceiptdetail_inventory_audit_detail_id
    ON goodsreceiptdetail (inventory_audit_detail_id);

CREATE INDEX IF NOT EXISTS idx_goodsissuedetail_inventory_audit_detail_id
    ON goodsissuedetail (inventory_audit_detail_id);

CREATE INDEX IF NOT EXISTS idx_goodsreceiptdetail_batchid
    ON goodsreceiptdetail (batchid);
