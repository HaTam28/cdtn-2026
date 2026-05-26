package hoshimoto.cdtn.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import hoshimoto.cdtn.entity.GoodsReceiptDetail;

public interface GoodsReceiptDetailRepository extends JpaRepository<GoodsReceiptDetail, Long> {
    List<GoodsReceiptDetail> findByGoodsReceiptId(Long receiptId);
    void deleteByGoodsReceiptId(Long receiptId);
}

