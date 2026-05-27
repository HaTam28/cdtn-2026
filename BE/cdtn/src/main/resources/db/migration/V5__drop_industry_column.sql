-- Drop industry column from item table (rollback of previous migration)
ALTER TABLE item DROP COLUMN IF EXISTS industry;
