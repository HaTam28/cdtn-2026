-- Add doctype column to goodsreceipt and goodsissue
ALTER TABLE goodsreceipt ADD COLUMN doctype VARCHAR(20);
ALTER TABLE goodsissue ADD COLUMN doctype VARCHAR(20);

-- Backfill existing rows: ADJUSTMENT when linked to an inventory audit, otherwise NORMAL
UPDATE goodsreceipt SET doctype = CASE WHEN inventory_audit_id IS NOT NULL THEN 'ADJUSTMENT' ELSE 'NORMAL' END;
UPDATE goodsissue SET doctype = CASE WHEN inventory_audit_id IS NOT NULL THEN 'ADJUSTMENT' ELSE 'NORMAL' END;

-- Set default to NORMAL for new rows
ALTER TABLE goodsreceipt ALTER COLUMN doctype SET DEFAULT 'NORMAL';
ALTER TABLE goodsissue ALTER COLUMN doctype SET DEFAULT 'NORMAL';

-- Make column NOT NULL to enforce a value
ALTER TABLE goodsreceipt ALTER COLUMN doctype SET NOT NULL;
ALTER TABLE goodsissue ALTER COLUMN doctype SET NOT NULL;
