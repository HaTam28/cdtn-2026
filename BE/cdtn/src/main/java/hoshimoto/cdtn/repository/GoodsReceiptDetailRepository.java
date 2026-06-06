package hoshimoto.cdtn.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import hoshimoto.cdtn.entity.GoodsReceiptDetail;

public interface GoodsReceiptDetailRepository extends JpaRepository<GoodsReceiptDetail, Long> {
    List<GoodsReceiptDetail> findByGoodsReceiptId(Long receiptId);
    void deleteByGoodsReceiptId(Long receiptId);

    @Query("""
            select count(d) > 0
            from GoodsReceiptDetail d
            where d.inventoryAuditDetailId = :auditDetailId
              and (:receiptId is null or d.goodsReceipt.id <> :receiptId)
              and d.goodsReceipt.docstatus <> hoshimoto.cdtn.entity.Enum.DocStatus.CANCELLED
              and d.goodsReceipt.docstatus <> hoshimoto.cdtn.entity.Enum.DocStatus.REJECTED
            """)
    boolean existsActiveAdjustmentByAuditDetailId(
            @Param("auditDetailId") Long auditDetailId,
            @Param("receiptId") Long receiptId);
}

