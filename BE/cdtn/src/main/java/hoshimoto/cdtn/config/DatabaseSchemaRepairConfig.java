package hoshimoto.cdtn.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseSchemaRepairConfig {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSchemaRepairConfig.class);

    @Bean
    CommandLineRunner repairDatabaseSchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            repairInventoryAuditDocstatusConstraint(jdbcTemplate);
            repairNotificationSequence(jdbcTemplate);
        };
    }

    private void repairInventoryAuditDocstatusConstraint(JdbcTemplate jdbcTemplate) {
        try {
            jdbcTemplate.execute("""
                DO $$
                DECLARE
                    constraint_name text;
                BEGIN
                    FOR constraint_name IN
                        SELECT c.conname
                        FROM pg_constraint c
                        JOIN pg_class t ON t.oid = c.conrelid
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
                """);
        } catch (Exception ex) {
            logger.warn("Failed to repair inventoryaudit docstatus constraint", ex);
        }
    }

    private void repairNotificationSequence(JdbcTemplate jdbcTemplate) {
        try {
            jdbcTemplate.execute("""
                DO $$
                DECLARE
                    seq_name text;
                BEGIN
                    SELECT pg_get_serial_sequence('notification', 'id') INTO seq_name;

                    IF seq_name IS NOT NULL THEN
                        EXECUTE format(
                            'SELECT setval(%L, COALESCE((SELECT MAX(id) FROM notification), 0) + 1, false)',
                            seq_name
                        );
                    END IF;
                END $$;
                """);
        } catch (Exception ex) {
            logger.warn("Failed to repair notification sequence", ex);
        }
    }
}
