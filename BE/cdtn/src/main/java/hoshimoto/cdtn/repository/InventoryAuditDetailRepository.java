package hoshimoto.cdtn.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import hoshimoto.cdtn.entity.InventoryAuditDetail;

public interface InventoryAuditDetailRepository extends JpaRepository<InventoryAuditDetail, Long> {
    List<InventoryAuditDetail> findByInventoryAuditId(Long auditId);
    List<InventoryAuditDetail> findByInventoryAuditIdOrderByIdAsc(Long auditId);
    void deleteByInventoryAuditId(Long auditId);
}
