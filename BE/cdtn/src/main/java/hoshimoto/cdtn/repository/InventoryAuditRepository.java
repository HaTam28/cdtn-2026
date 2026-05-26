package hoshimoto.cdtn.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import hoshimoto.cdtn.entity.InventoryAudit;

public interface InventoryAuditRepository extends JpaRepository<InventoryAudit, Long> {
    Optional<InventoryAudit> findByDocno(String docno);
    List<InventoryAudit> findAllByOrderByCreatedAtDesc();
    List<InventoryAudit> findByAssignedUserIdAndDocstatusOrderByCreatedAtDesc(Long assignedUserId, hoshimoto.cdtn.entity.Enum.DocStatus docstatus);
    List<InventoryAudit> findByAssignedUserIdAndDocstatusInOrderByCreatedAtDesc(Long assignedUserId, List<hoshimoto.cdtn.entity.Enum.DocStatus> docstatus);
    List<InventoryAudit> findByDocstatusOrderByCreatedAtDesc(hoshimoto.cdtn.entity.Enum.DocStatus docstatus);

    @Query("select r.docno from InventoryAudit r where r.docno like concat(:prefix, '%')")
    List<String> findDocnosByPrefix(@Param("prefix") String prefix);
}
