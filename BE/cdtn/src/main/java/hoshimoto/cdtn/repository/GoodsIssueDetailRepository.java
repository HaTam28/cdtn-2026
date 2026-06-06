package hoshimoto.cdtn.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import hoshimoto.cdtn.entity.GoodsIssueDetail;

public interface GoodsIssueDetailRepository extends JpaRepository<GoodsIssueDetail, Long> {
    List<GoodsIssueDetail> findByGoodsIssueId(Long issueId);
    void deleteByGoodsIssueId(Long issueId);

    @Query("""
            select count(d) > 0
            from GoodsIssueDetail d
            where d.inventoryAuditDetailId = :auditDetailId
              and (:issueId is null or d.goodsIssue.id <> :issueId)
              and d.goodsIssue.docstatus <> hoshimoto.cdtn.entity.Enum.DocStatus.CANCELLED
              and d.goodsIssue.docstatus <> hoshimoto.cdtn.entity.Enum.DocStatus.REJECTED
            """)
    boolean existsActiveAdjustmentByAuditDetailId(
            @Param("auditDetailId") Long auditDetailId,
            @Param("issueId") Long issueId);
}

