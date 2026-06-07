DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE t.relname = 'inventoryaudit'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%docstatus%'
    LOOP
        EXECUTE format('ALTER TABLE inventoryaudit DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;

    ALTER TABLE inventoryaudit
        ADD CONSTRAINT chk_inventoryaudit_docstatus
        CHECK (docstatus IN (
            'DRAFT',
            'REQUESTED',
            'IN_PROGRESS',
            'OVERDUE',
            'SUBMITTED',
            'PENDING_PROCESS',
            'PROCESSED',
            'CONFIRMED',
            'CANCELLED',
            'REJECTED'
        ));
END $$;
