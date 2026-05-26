-- Migration: add adjustment_flags to inventoryaudit and inventory_audit_id to goodsreceipt/goodsissue
-- Run once; ensure this matches your DB migration strategy (Flyway/Liquibase) or apply manually.

ALTER TABLE inventoryaudit
    ADD COLUMN IF NOT EXISTS adjustment_flags TEXT;

ALTER TABLE goodsreceipt
    ADD COLUMN IF NOT EXISTS inventory_audit_id BIGINT;

ALTER TABLE goodsissue
    ADD COLUMN IF NOT EXISTS inventory_audit_id BIGINT;

-- Optional: add invoiceNumber column if missing
ALTER TABLE goodsreceipt
    ADD COLUMN IF NOT EXISTS invoicenumber VARCHAR(100);

-- Add foreign key constraint if desired (uncomment and adjust constraint names and cascade rules):
-- ALTER TABLE goodsreceipt
--     ADD CONSTRAINT fk_goodsreceipt_inventoryaudit FOREIGN KEY (inventory_audit_id) REFERENCES inventoryaudit(id);
-- ALTER TABLE goodsissue
--     ADD CONSTRAINT fk_goodsissue_inventoryaudit FOREIGN KEY (inventory_audit_id) REFERENCES inventoryaudit(id);
