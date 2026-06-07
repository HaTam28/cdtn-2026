ALTER TABLE inventoryaudit
    ADD COLUMN IF NOT EXISTS startdate DATE,
    ADD COLUMN IF NOT EXISTS enddate DATE;

ALTER TABLE inventoryauditdetail
    ADD COLUMN IF NOT EXISTS batchid BIGINT,
    ADD COLUMN IF NOT EXISTS locationid BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventoryauditdetail_batch'
    ) THEN
        ALTER TABLE inventoryauditdetail
            ADD CONSTRAINT fk_inventoryauditdetail_batch
            FOREIGN KEY (batchid) REFERENCES batch(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventoryauditdetail_location'
    ) THEN
        ALTER TABLE inventoryauditdetail
            ADD CONSTRAINT fk_inventoryauditdetail_location
            FOREIGN KEY (locationid) REFERENCES location(id);
    END IF;
END $$;
