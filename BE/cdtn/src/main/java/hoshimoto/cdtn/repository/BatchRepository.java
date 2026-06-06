package hoshimoto.cdtn.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import hoshimoto.cdtn.entity.Batch;

public interface BatchRepository extends JpaRepository<Batch, Long> {
    Optional<Batch> findByBatchCode(String batchCode);
    List<Batch> findAllByOrderByCreatedAtDesc();
    List<Batch> findAllByBatchCodeStartingWithOrderByBatchCodeDesc(String prefix);
    Optional<Batch> findByReceiptDetailId(Long receiptDetailId);
    List<Batch> findAllByReceiptDetailLocationIdAndItemId(Long locationId, Long itemId);
    List<Batch> findAllByReceiptDetailLocationId(Long locationId);

    @Query("SELECT b FROM Batch b WHERE b.item.id = :itemId AND b.receiptDetail.goodsReceipt.docstatus = hoshimoto.cdtn.entity.Enum.DocStatus.CONFIRMED")
    List<Batch> findConfirmedByItemId(@Param("itemId") Long itemId);

    @Query("SELECT b FROM Batch b WHERE b.item.id = :itemId " +
           "AND (:locationId IS NULL OR b.receiptDetail.location.id = :locationId) " +
           "AND b.receiptDetail.goodsReceipt.docstatus = hoshimoto.cdtn.entity.Enum.DocStatus.CONFIRMED " +
           "AND COALESCE(b.quantityRemaining, 0) > 0 " +
           "ORDER BY b.receiptDetail.location.locationcode ASC, b.batchCode ASC")
    List<Batch> findConfirmedStockRows(@Param("itemId") Long itemId, @Param("locationId") Long locationId);

    @Query("SELECT b FROM Batch b WHERE b.item.id = :itemId AND b.receiptDetail.goodsReceipt.id = :receiptId")
    Optional<Batch> findByItemIdAndReceiptId(@Param("itemId") Long itemId, @Param("receiptId") Long receiptId);
}
